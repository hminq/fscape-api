const { sequelize } = require("../config/db");
const { Op } = require("sequelize");
const {
  DEPOSIT_MONTHS,
  MIN_CHECKIN_DAYS,
  MAX_CHECKIN_DAYS,
  BOOKING_EXPIRY_MS,
} = require("../constants/booking");
const {
  isValidContractLength,
  isValidBookingBillingCycle,
} = require("../constants/bookingEnums");
const { normalizeBillingCycle } = require("../utils/billingCycle.util");
const { generateNumberedId } = require("../utils/generateId");
const { parseUTCDate } = require("../utils/date.util");

const createBooking = async (userId, bookingData) => {
  const { Booking, Room, RoomType, User, CustomerProfile } = sequelize.models;
  const {
    room_id,
    check_in_date,
    duration_months,
    billing_cycle,
    customer_info,
  } = bookingData;
  const resolvedDurationMonths = Number(duration_months);

  if (!isValidContractLength(resolvedDurationMonths)) {
    throw {
      status: 400,
      message: "Thời hạn hợp đồng chỉ hỗ trợ 6 hoặc 12 tháng.",
    };
  }

  // Validate check-in date within [today + MIN, today + MAX].
  const todayStr = new Date().toISOString().split('T')[0];
  const today = parseUTCDate(todayStr);
  const minCheckIn = new Date(today);
  minCheckIn.setUTCDate(minCheckIn.getUTCDate() + MIN_CHECKIN_DAYS);
  const maxCheckIn = new Date(today);
  maxCheckIn.setUTCDate(maxCheckIn.getUTCDate() + MAX_CHECKIN_DAYS);
  const checkIn = parseUTCDate(check_in_date);
  if (checkIn < minCheckIn || checkIn > maxCheckIn) {
    throw {
      status: 400,
      message: `Ngày nhận phòng phải trong khoảng ${MIN_CHECKIN_DAYS}-${MAX_CHECKIN_DAYS} ngày kể từ hôm nay.`,
    };
  }

  // Validate billing cycle from user input
  const resolvedBillingCycle = normalizeBillingCycle(billing_cycle);
  if (!isValidBookingBillingCycle(resolvedBillingCycle)) {
    throw {
      status: 400,
      message:
        "Chu kỳ thanh toán không hợp lệ (CYCLE_1M, CYCLE_3M, CYCLE_6M, ALL_IN).",
    };
  }

  const transaction = await sequelize.transaction();
  let booking;

  try {
    // 1) Lock room row first.
    const room = await Room.findByPk(room_id, {
      include: [{ model: RoomType, as: "room_type", required: true }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!room) {
      throw { status: 404, message: "Không tìm thấy phòng." };
    }

    if (room.status !== "AVAILABLE") {
      throw { status: 400, message: "Phòng này hiện không còn trống." };
    }

    // 2) Fetch room type (no lock needed).
    const roomType = await RoomType.findByPk(room.room_type_id, {
      transaction,
    });
    const basePrice = Number(roomType?.base_price || 0);
    const depositAmount = basePrice * DEPOSIT_MONTHS;

    // 3) Upsert customer profile details.
    const [profile, created] = await CustomerProfile.findOrCreate({
      where: { user_id: userId },
      defaults: {
        gender: customer_info?.gender?.toUpperCase(),
        date_of_birth: customer_info?.date_of_birth,
        permanent_address: customer_info?.permanent_address,
        emergency_contact_name: customer_info?.emergency_contact_name,
        emergency_contact_phone: customer_info?.emergency_contact_phone,
      },
      transaction,
    });

    if (!created && customer_info) {
      await profile.update(
        {
          gender: customer_info.gender?.toUpperCase() || profile.gender,
          date_of_birth: customer_info.date_of_birth || profile.date_of_birth,
          permanent_address:
            customer_info.permanent_address || profile.permanent_address,
          emergency_contact_name:
            customer_info.emergency_contact_name || profile.emergency_contact_name,
          emergency_contact_phone:
            customer_info.emergency_contact_phone ||
            profile.emergency_contact_phone,
        },
        { transaction },
      );
    }

    // 4) Create booking in PENDING status.
    booking = await Booking.create(
      {
        booking_number: generateNumberedId("BK"),
        room_id,
        customer_id: userId,
        check_in_date,
        duration_months: resolvedDurationMonths,
        billing_cycle: resolvedBillingCycle,
        status: "PENDING",
        room_price_snapshot: basePrice,
        deposit_amount: depositAmount,
        expires_at: new Date(Date.now() + BOOKING_EXPIRY_MS),
      },
      { transaction },
    );

    // 5) Reserve room by setting LOCKED status.
    await room.update({ status: "LOCKED" }, { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return booking;
};

const getMyBookings = async (userId, query = {}) => {
  const { Booking, Room, Building, RoomType, Contract } = sequelize.models;

  const {
    page = 1,
    limit = 10,
    sort_by = 'created_at',
    sort_order = 'DESC',
    status,
    search,
  } = query;

  const offset = (page - 1) * limit;
  const where = { customer_id: userId };

  // Status filter
  if (status === 'active') {
    where.status = { [Op.in]: ['PENDING', 'DEPOSIT_PAID'] };
  } else if (status && status !== 'all') {
    where.status = status;
  }

  // Search by booking_number
  if (search) {
    where.booking_number = { [Op.iLike]: `%${search}%` };
  }

  // Allowed sort columns
  const sortColumnMap = {
    created_at: 'createdAt',
    check_in_date: 'check_in_date',
    room_price_snapshot: 'room_price_snapshot',
    status: 'status',
  };
  const sortCol = sortColumnMap[sort_by] || 'createdAt';
  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows } = await Booking.findAndCountAll({
    where,
    attributes: [
      "id",
      "booking_number",
      "status",
      "check_in_date",
      "duration_months",
      "room_price_snapshot",
      "deposit_amount",
      "deposit_paid_at",
      "expires_at",
      "cancelled_at",
      "cancellation_reason",
      "contract_id",
      "createdAt",
    ],
    include: [
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number", "floor", "thumbnail_url"],
        include: [
          {
            model: Building,
            as: "building",
            attributes: ["id", "name", "address"],
          },
          {
            model: RoomType,
            as: "room_type",
            attributes: ["id", "name", "area_sqm", "bedrooms", "bathrooms"],
          },
        ],
      },
      {
        model: Contract,
        as: "contract",
        attributes: ["id", "status"],
        required: false,
      },
    ],
    distinct: true,
    limit: Number(limit),
    offset: Number(offset),
    order: [[sortCol, sortDir]],
  });

  return {
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit),
    data: rows,
  };
};

const getBookingById = async (id, caller) => {
  const { Booking, Room, Building, RoomType, User, CustomerProfile } = sequelize.models;
  const booking = await Booking.findByPk(id, {
    include: [
      {
        model: Room,
        as: "room",
        include: [
          { model: Building, as: "building" },
          { model: RoomType, as: "room_type" },
        ],
      },
      {
        model: User,
        as: "customer",
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar_url'],
        include: [
          { model: CustomerProfile, as: 'profile', attributes: ['gender', 'date_of_birth', 'permanent_address'] },
        ],
      },
    ],
  });

  if (!booking) throw { status: 404, message: "Không tìm thấy đơn đặt phòng." };

  const role = caller.role || caller;
  if (role === 'BUILDING_MANAGER') {
    const bookingBuildingId = booking.room?.building?.id || booking.room?.building_id;
    if (!bookingBuildingId || bookingBuildingId !== caller.building_id) {
      throw { status: 403, message: "Bạn không có quyền truy cập đơn này." };
    }
  } else if (role !== 'ADMIN') {
    if (booking.customer_id !== caller.id)
      throw { status: 403, message: "Bạn không có quyền truy cập đơn này." };
  }

  return booking;
};
const getAllBookings = async (filters = {}, caller = {}) => {
    const { Booking, Room, Building, RoomType, User, CustomerProfile } = sequelize.models;
    
    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Build where clause
    const where = {};
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.booking_number) {
        where.booking_number = { [Op.iLike]: `%${filters.booking_number}%` };
    }
    if (filters.search) {
        where[Op.or] = [
            { booking_number: { [Op.iLike]: `%${filters.search}%` } },
            { '$customer.first_name$': { [Op.iLike]: `%${filters.search}%` } },
            { '$customer.last_name$': { [Op.iLike]: `%${filters.search}%` } },
            { '$room.room_number$': { [Op.iLike]: `%${filters.search}%` } }
        ];
    }
    
    // Build includes with nested where for related models
    const buildingWhere = caller.role === 'BUILDING_MANAGER'
        ? { id: caller.building_id }
        : filters.building_id
            ? { id: filters.building_id }
            : (filters.building_name ? { name: { [Op.iLike]: `%${filters.building_name}%` } } : undefined);

    const include = [
        {
            model: Room,
            as: 'room',
            attributes: ['id', 'room_number', 'floor', 'thumbnail_url'],
            where: filters.room_number ? { room_number: { [Op.iLike]: `%${filters.room_number}%` } } : undefined,
            include: [
                {
                    model: Building,
                    as: 'building',
                    attributes: ['id', 'name', 'address'],
                    where: buildingWhere,
                },
                {
                    model: RoomType,
                    as: 'room_type',
                    attributes: ['id', 'name', 'area_sqm', 'bedrooms', 'bathrooms']
                }
            ]
        },
        {
            model: User,
            as: 'customer',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
            where: filters.customer_name ? {
                [Op.or]: [
                    { first_name: { [Op.iLike]: `%${filters.customer_name}%` } },
                    { last_name: { [Op.iLike]: `%${filters.customer_name}%` } },
                    { email: { [Op.iLike]: `%${filters.customer_name}%` } }
                ]
            } : undefined,
            include: [
                {
                    model: CustomerProfile,
                    as: 'profile',
                    attributes: ['gender', 'date_of_birth', 'permanent_address']
                }
            ]
        }
    ];
    
    // Remove undefined where clauses
    include.forEach(inc => {
        if (inc.where === undefined) delete inc.where;
        if (inc.include) {
            inc.include.forEach(nested => {
                if (nested.where === undefined) delete nested.where;
            });
        }
    });
    
    const { count, rows } = await Booking.findAndCountAll({
        attributes: [
            'id', 'booking_number', 'status', 'check_in_date', 'duration_months',
            'room_price_snapshot', 'deposit_amount', 'deposit_paid_at',
            'expires_at', 'cancelled_at', 'cancellation_reason', 'createdAt'
        ],
        include,
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true,
        subQuery: false, // Required when filtering by associated models with limit
    });
    
    return {
        data: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            hasNextPage: page < Math.ceil(count / limit),
            hasPrevPage: page > 1
        }
    };
};

const cancelBookingForPaymentFailure = async (bookingId) => {
  const { Booking, Room } = sequelize.models;

  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!booking || booking.status !== "PENDING") {
      await transaction.rollback();
      return false;
    }

    await booking.update(
      {
        status: "CANCELLED",
        cancelled_at: new Date(),
        cancellation_reason: "Không thể khởi tạo thanh toán",
      },
      { transaction },
    );

    await Room.update(
      { status: "AVAILABLE" },
      { where: { id: booking.room_id }, transaction },
    );

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  getAllBookings,
  cancelBookingForPaymentFailure,
};
