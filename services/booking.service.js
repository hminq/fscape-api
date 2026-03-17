const { sequelize } = require('../config/db');
const {
    DEPOSIT_MONTHS,
    MIN_CHECKIN_DAYS,
    MAX_CHECKIN_DAYS,
    BOOKING_EXPIRY_MS
} = require('../constants/booking');
const {
    isValidContractLength,
    isValidBookingBillingCycle
} = require('../constants/bookingEnums');
const { normalizeBillingCycle } = require('../utils/billingCycle.util');
const { generateNumberedId } = require('../utils/generateId');
const { parseLocalDate } = require('../utils/date.util');

const createBooking = async (userId, bookingData) => {
    const { Booking, Room, RoomType, User, CustomerProfile } = sequelize.models;
    const { roomId, checkInDate, rentalTerm, durationMonths, billingCycle, customerInfo } = bookingData;
    const resolvedDurationMonths = Number(durationMonths ?? bookingData.duration_months ?? rentalTerm);

    if (!isValidContractLength(resolvedDurationMonths)) {
        throw { status: 400, message: 'Thời hạn hợp đồng chỉ hỗ trợ 6 hoặc 12 tháng.' };
    }

    // Validate check-in date: phải trong khoảng [today + MIN, today + MAX]
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minCheckIn = new Date(today);
    minCheckIn.setDate(minCheckIn.getDate() + MIN_CHECKIN_DAYS);
    const maxCheckIn = new Date(today);
    maxCheckIn.setDate(maxCheckIn.getDate() + MAX_CHECKIN_DAYS);
    const checkIn = parseLocalDate(checkInDate);
    if (checkIn < minCheckIn || checkIn > maxCheckIn) {
        throw { status: 400, message: `Ngày nhận phòng phải trong khoảng ${MIN_CHECKIN_DAYS}–${MAX_CHECKIN_DAYS} ngày kể từ hôm nay.` };
    }

    // Validate billing cycle from user input
    const resolvedBillingCycle = normalizeBillingCycle(billingCycle ?? bookingData.billing_cycle);
    if (!isValidBookingBillingCycle(resolvedBillingCycle)) {
        throw { status: 400, message: 'Chu kỳ thanh toán không hợp lệ (CYCLE_1M, CYCLE_3M, CYCLE_6M, ALL_IN).' };
    }

    const transaction = await sequelize.transaction();
    let booking;

    try {
        // 1. Lock phòng trước
        const room = await Room.findByPk(roomId, {
            include: [{ model: RoomType, as: 'room_type', required: true }],
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!room) {
            throw { status: 404, message: 'Không tìm thấy phòng.' };
        }

        if (room.status !== 'AVAILABLE') {
            throw { status: 400, message: 'Phòng này hiện không còn trống.' };
        }

        // 2. Lấy room type riêng (không cần lock)
        const roomType = await RoomType.findByPk(room.room_type_id, { transaction });
        const basePrice = Number(roomType?.base_price || 0);
        const depositAmount = basePrice * DEPOSIT_MONTHS;

        // 3. Lưu thông tin hồ sơ khách hàng (CustomerProfile)
        const [profile, created] = await CustomerProfile.findOrCreate({
            where: { user_id: userId },
            defaults: {
                gender: customerInfo.gender?.toUpperCase(),
                date_of_birth: customerInfo.dateOfBirth,
                permanent_address: customerInfo.permanentAddress,
                emergency_contact_name: customerInfo.emergencyContactName,
                emergency_contact_phone: customerInfo.emergencyContactPhone
            },
            transaction
        });

        if (!created && customerInfo) {
            await profile.update({
                gender: customerInfo.gender?.toUpperCase() || profile.gender,
                date_of_birth: customerInfo.dateOfBirth || profile.date_of_birth,
                permanent_address: customerInfo.permanentAddress || profile.permanent_address,
                emergency_contact_name: customerInfo.emergencyContactName || profile.emergency_contact_name,
                emergency_contact_phone: customerInfo.emergencyContactPhone || profile.emergency_contact_phone
            }, { transaction });
        }

        // 4. Tạo Booking (PENDING — chờ thanh toán VNPAY)
        booking = await Booking.create({
            booking_number: generateNumberedId('BK'),
            room_id: roomId,
            customer_id: userId,
            check_in_date: checkInDate,
            duration_months: resolvedDurationMonths,
            billing_cycle: resolvedBillingCycle,
            status: 'PENDING',
            room_price_snapshot: basePrice,
            deposit_amount: depositAmount,
            expires_at: new Date(Date.now() + BOOKING_EXPIRY_MS)
        }, { transaction });

        // 5. Giữ chỗ phòng
        await room.update({ status: 'LOCKED' }, { transaction });

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }

    return booking;
};

const getMyBookings = async (userId) => {
    const { Booking, Room, Building, RoomType } = sequelize.models;
    return await Booking.findAll({
        where: { customer_id: userId },
        attributes: [
            'id', 'booking_number', 'status', 'check_in_date', 'duration_months',
            'room_price_snapshot', 'deposit_amount', 'deposit_paid_at',
            'expires_at', 'cancelled_at', 'cancellation_reason', 'createdAt'
        ],
        include: [{
            model: Room,
            as: 'room',
            attributes: ['id', 'room_number', 'floor', 'thumbnail_url'],
            include: [
                {
                    model: Building,
                    as: 'building',
                    attributes: ['id', 'name', 'address']
                },
                {
                    model: RoomType,
                    as: 'room_type',
                    attributes: ['id', 'name', 'area_sqm', 'bedrooms', 'bathrooms']
                }
            ]
        }],
        order: [['createdAt', 'DESC']]
    });
};

const getBookingById = async (id, userId) => {
    const { Booking, Room, Building, RoomType } = sequelize.models;
    const booking = await Booking.findByPk(id, {
        include: [
            {
                model: Room,
                as: 'room',
                include: [
                    { model: Building, as: 'building' },
                    { model: RoomType, as: 'room_type' }
                ]
            }
        ]
    });

    if (!booking) throw { status: 404, message: 'Không tìm thấy đơn đặt phòng.' };
    if (booking.customer_id !== userId) throw { status: 403, message: 'Bạn không có quyền truy cập đơn này.' };

    return booking;
};

module.exports = {
    createBooking,
    getMyBookings,
    getBookingById
};
