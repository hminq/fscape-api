const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Room = require('../models/room.model');
const RoomImage = require('../models/roomImage.model');
const Building = require('../models/building.model');
const RoomType = require('../models/roomType.model');
const Booking = require('../models/booking.model');
const Contract = require('../models/contract.model');
const Request = require('../models/request.model');
const User = require('../models/user.model');

const { ROLES } = require('../constants/roles');
const { generateRoomNumbers } = require('../utils/roomNumber.util');

// ─── Booking/Contract statuses that block delete or lock ──────
const ACTIVE_BOOKING_STATUSES = ['PENDING', 'DEPOSIT_PAID'];
const ACTIVE_CONTRACT_STATUSES = [
  'DRAFT', 'PENDING_CUSTOMER_SIGNATURE', 'PENDING_MANAGER_SIGNATURE',
  'ACTIVE', 'EXPIRING_SOON'
];

// ─── Fields to strip per role on detail response ──────────────
const TIMESTAMP_FIELDS = ['created_at', 'updated_at', 'deleted_at', 'createdAt', 'updatedAt', 'deletedAt'];

// ─── GET /api/rooms ───────────────────────────────────────────
const getAllRooms = async (query = {}, user = {}) => {
  const { page = 1, limit = 10, building_id, room_type_id, status, floor, search } = query;
  const offset = (page - 1) * limit;
  const where = {};

  // Building-scoped access for BUILDING_MANAGER and STAFF
  if (user.role === ROLES.BUILDING_MANAGER || user.role === ROLES.STAFF) {
    where.building_id = user.building_id;
  } else if (building_id) {
    where.building_id = building_id;
  }

  if (room_type_id) where.room_type_id = room_type_id;
  if (status) where.status = status;
  if (floor !== undefined) where.floor = floor;
  if (search) where.room_number = { [Op.iLike]: `%${search}%` };

  const { count, rows } = await Room.findAndCountAll({
    where,
    include: [
      { model: Building, as: 'building', attributes: ['id', 'name'] },
      { model: RoomType, as: 'room_type', attributes: ['id', 'name', 'base_price'] }
    ],
    limit: Number(limit),
    offset: Number(offset),
    order: [['createdAt', 'DESC']]
  });

  let data = rows;

  // Strip timestamps for non-admin roles
  if (user.role !== ROLES.ADMIN) {
    data = rows.map(row => {
      const obj = row.toJSON();
      for (const field of TIMESTAMP_FIELDS) delete obj[field];
      return obj;
    });
  }

  return {
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit),
    data
  };
};

// ─── GET /api/rooms/:id ──────────────────────────────────────
const getRoomById = async (id, user = {}) => {
  const role = user.role || 'PUBLIC';


  const room = await Room.findByPk(id, {
    include: [
      { model: Building, as: 'building' },
      { model: RoomType, as: 'room_type' },
      { model: RoomImage, as: 'images', attributes: ['id', 'image_url'] }
    ]
  });

  if (!room) throw { status: 404, message: 'Room not found' };

  // Building-scoped: BUILDING_MANAGER and STAFF can only see rooms in their building
  if (
    (role === ROLES.BUILDING_MANAGER || role === ROLES.STAFF) &&
    user.building_id !== room.building_id
  ) {
    throw { status: 403, message: 'You can only view rooms in your assigned building' };
  }

  const data = room.toJSON();

  // ─── Fetch additional data based on role ──────────────────
  if (role === ROLES.ADMIN || role === ROLES.BUILDING_MANAGER || role === ROLES.STAFF) {
    // 1. Find the current resident (user with an ACTIVE contract on this room)
    const activeContract = await Contract.findOne({
      where: { room_id: id, status: 'ACTIVE' },
      include: [{ model: User, as: 'customer', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar_url'] }]
    });

    if (activeContract && activeContract.customer) {
      const resident = activeContract.customer;
      data.current_resident = resident;

      // 2. Fetch all requests made by this resident for this room
      if (role === ROLES.ADMIN || role === ROLES.STAFF) {
        data.resident_requests = await Request.findAll({
          where: { room_id: id, resident_id: resident.id },
          attributes: ['id', 'request_number', 'title', 'status', 'request_type', 'created_at'],
          order: [['createdAt', 'DESC']]
        });
      }

      // 3. Fetch all bookings and contracts made by this resident for this room
      if (role === ROLES.ADMIN || role === ROLES.BUILDING_MANAGER) {
        data.resident_bookings = await Booking.findAll({
          where: { room_id: id, customer_id: resident.id },
          attributes: ['id', 'booking_number', 'status', 'check_in_date', 'expires_at'],
          order: [['createdAt', 'DESC']]
        });

        data.resident_contracts = await Contract.findAll({
          where: { room_id: id, customer_id: resident.id },
          attributes: ['id', 'contract_number', 'status', 'start_date', 'end_date', 'base_rent', 'term_type'],
          order: [['createdAt', 'DESC']]
        });
      }
    } else {
      data.current_resident = null;
      data.resident_requests = [];
      data.resident_bookings = [];
      data.resident_contracts = [];
    }
  }

  // ─── Strip fields based on role ───────────────────────────
  if (role === 'PUBLIC' || role === ROLES.RESIDENT || role === ROLES.CUSTOMER) {
    // Public/Resident: basic info only, no timestamps, no internal data
    for (const field of TIMESTAMP_FIELDS) delete data[field];
    if (data.building) {
      data.building = { id: data.building.id, name: data.building.name };
    }
    if (data.room_type) {
      data.room_type = { id: data.room_type.id, name: data.room_type.name, base_price: data.room_type.base_price };
    }
  } else if (role === ROLES.STAFF || role === ROLES.BUILDING_MANAGER) {
    // No timestamps
    for (const field of TIMESTAMP_FIELDS) delete data[field];
  }
  // ADMIN: no stripping — sees everything

  if (data.images) {
    data.images = data.images.map(img => img.image_url);
  }

  return data;
};

// ─── POST /api/rooms ─────────────────────────────────────────
const createRoom = async (data) => {
  const { gallery_images, ...roomData } = data;

  const existingRoom = await Room.findOne({
    where: { building_id: roomData.building_id, room_number: roomData.room_number }
  });
  if (existingRoom) {
    throw { status: 409, message: `Room number ${roomData.room_number} already exists in this building` };
  }

  const transaction = await sequelize.transaction();
  try {
    const room = await Room.create(roomData, { transaction });

    if (gallery_images && gallery_images.length > 0) {
      const imageRecords = gallery_images.map(url => ({
        room_id: room.id,
        image_url: url
      }));
      await RoomImage.bulkCreate(imageRecords, { transaction });
    }

    await transaction.commit();

    // Fetch the created room with minimal required relations
    const createdRoom = await Room.findByPk(room.id, {
      include: [
        { model: Building, as: 'building' },
        { model: RoomType, as: 'room_type' },
        { model: RoomImage, as: 'images', attributes: ['image_url'] }
      ]
    });

    const responseData = createdRoom.toJSON();
    if (responseData.images) {
      responseData.images = responseData.images.map(img => img.image_url);
    }

    return responseData;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ─── PUT /api/rooms/:id ──────────────────────────────────────
const updateRoom = async (id, data) => {
  const { gallery_images, ...updateData } = data;

  const room = await Room.findByPk(id);
  if (!room) throw { status: 404, message: 'Room not found' };

  // Guard against changing fundamental identity parameters if there are active bookings or contracts
  const hasCriticalChanges = updateData.building_id || updateData.room_type_id || updateData.room_number;
  if (hasCriticalChanges) {
    const activeBooking = await Booking.findOne({
      where: { room_id: id, status: { [Op.in]: ACTIVE_BOOKING_STATUSES } }
    });
    if (activeBooking) {
      throw { status: 409, message: 'Cannot change building, room type, or room number of a room with active bookings' };
    }

    const activeContract = await Contract.findOne({
      where: { room_id: id, status: { [Op.in]: ACTIVE_CONTRACT_STATUSES } }
    });
    if (activeContract) {
      throw { status: 409, message: 'Cannot change building, room type, or room number of a room with active contracts' };
    }
  }

  if (updateData.room_number && updateData.room_number !== room.room_number) {
    const existingRoom = await Room.findOne({
      where: { building_id: room.building_id, room_number: updateData.room_number }
    });
    if (existingRoom) {
      throw { status: 409, message: `Room number ${updateData.room_number} already exists in this building` };
    }
  }

  const transaction = await sequelize.transaction();
  try {
    await room.update(updateData, { transaction });

    if (gallery_images) {
      await RoomImage.destroy({ where: { room_id: id }, transaction });
      if (gallery_images.length > 0) {
        const imageRecords = gallery_images.map(url => ({
          room_id: id,
          image_url: url
        }));
        await RoomImage.bulkCreate(imageRecords, { transaction });
      }
    }

    await transaction.commit();
    return getRoomById(id, { role: ROLES.ADMIN });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ─── DELETE /api/rooms/:id (soft delete) ─────────────────────
const deleteRoom = async (id) => {
  const room = await Room.findByPk(id);
  if (!room) throw { status: 404, message: 'Room not found' };

  // Guard: cannot delete if active bookings exist
  const activeBooking = await Booking.findOne({
    where: { room_id: id, status: { [Op.in]: ACTIVE_BOOKING_STATUSES } }
  });
  if (activeBooking) {
    throw { status: 409, message: 'Cannot delete room with active bookings' };
  }

  // Guard: cannot delete if active contracts exist
  const activeContract = await Contract.findOne({
    where: { room_id: id, status: { [Op.in]: ACTIVE_CONTRACT_STATUSES } }
  });
  if (activeContract) {
    throw { status: 409, message: 'Cannot delete room with active contracts' };
  }

  await room.destroy(); // paranoid: sets deleted_at
  return { message: `Room ${room.room_number} deleted successfully` };
};

// ─── PATCH /api/rooms/:id/status ─────────────────────────────
const toggleRoomStatus = async (id, targetStatus, user) => {
  if (!['AVAILABLE', 'LOCKED'].includes(targetStatus)) {
    throw { status: 400, message: 'Status must be AVAILABLE or LOCKED' };
  }

  const room = await Room.findByPk(id);
  if (!room) throw { status: 404, message: 'Room not found' };

  // Building-scoped: managers can only toggle rooms in their building
  if (user.role === ROLES.BUILDING_MANAGER && user.building_id !== room.building_id) {
    throw { status: 403, message: 'You can only manage rooms in your assigned building' };
  }

  if (room.status === targetStatus) {
    throw { status: 400, message: `Room is already ${targetStatus}` };
  }

  // Can only lock AVAILABLE rooms, can only unlock LOCKED rooms
  if (targetStatus === 'LOCKED' && room.status !== 'AVAILABLE') {
    throw { status: 409, message: `Cannot lock a room with status ${room.status}` };
  }
  if (targetStatus === 'AVAILABLE' && room.status !== 'LOCKED') {
    throw { status: 409, message: `Cannot unlock a room with status ${room.status}` };
  }

  // Guard: cannot lock if active bookings or contracts
  if (targetStatus === 'LOCKED') {
    const activeBooking = await Booking.findOne({
      where: { room_id: id, status: { [Op.in]: ACTIVE_BOOKING_STATUSES } }
    });
    if (activeBooking) {
      throw { status: 409, message: 'Cannot lock room with active bookings' };
    }

    const activeContract = await Contract.findOne({
      where: { room_id: id, status: { [Op.in]: ACTIVE_CONTRACT_STATUSES } }
    });
    if (activeContract) {
      throw { status: 409, message: 'Cannot lock room with active contracts' };
    }
  }

  room.status = targetStatus;
  await room.save();
  return room;
};

const getRoomsByBuilding = async (buildingId, query = {}, user = {}) => {

  const { status, floor, search } = query;

  const where = {
    building_id: buildingId
  };

  if (status) where.status = status;
  if (floor !== undefined) where.floor = floor;
  if (search) where.room_number = { [Op.iLike]: `%${search}%` };

  // Building-scoped access
  if (
    (user.role === ROLES.BUILDING_MANAGER || user.role === ROLES.STAFF) &&
    user.building_id !== buildingId
  ) {
    throw { status: 403, message: 'You can only view rooms in your assigned building' };
  }

  const rooms = await Room.findAll({
    where,
    include: [
      {
        model: RoomType,
        as: 'room_type',
        attributes: [
          'id',
          'name',
          'base_price',
          'capacity_min',
          'capacity_max',
          'area_sqm'
        ]
      },
      {
        model: RoomImage,
        as: 'images',
        attributes: ['image_url']
      }
    ],
    order: [
      ['floor', 'ASC'],
      ['room_number', 'ASC']
    ]
  });

  let data = rooms.map(r => r.toJSON());

  // Strip timestamps for non-admin
  if (user.role !== ROLES.ADMIN) {
    data = data.map(room => {
      for (const field of TIMESTAMP_FIELDS) delete room[field];
      return room;
    });
  }

  // Convert images → array of urls
  data = data.map(room => {
    if (room.images) {
      room.images = room.images.map(img => img.image_url);
    }
    return room;
  });

  return data;
};

// ─── GET /api/rooms/my — rooms for CUSTOMER/RESIDENT ────────
const getMyRooms = async (userId) => {
  // Find rooms where the user has an active contract
  const contracts = await Contract.findAll({
    where: {
      customer_id: userId,
      status: { [Op.in]: ['ACTIVE', 'EXPIRING_SOON'] }
    },
    attributes: ['id', 'contract_number', 'status', 'start_date', 'end_date', 'base_rent'],
    include: [{
      model: Room,
      as: 'room',
      attributes: ['id', 'room_number', 'floor', 'thumbnail_url', 'status'],
      include: [
        {
          model: Building,
          as: 'building',
          attributes: ['id', 'name', 'address', 'thumbnail_url']
        },
        {
          model: RoomType,
          as: 'room_type',
          attributes: ['id', 'name', 'area_sqm', 'bedrooms', 'bathrooms', 'capacity_max']
        }
      ]
    }],
    order: [['start_date', 'DESC']]
  });

  return contracts;
};

// ─── POST /api/rooms/batch ──────────────────────────────────
const createBatchRooms = async ({
  building_id, room_type_id, floor, count,
  thumbnail_url, image_3d_url, blueprint_url, gallery_images
}) => {
  const building = await Building.findByPk(building_id);
  if (!building) throw { status: 404, message: 'Building not found' };

  const roomType = await RoomType.findByPk(room_type_id);
  if (!roomType) throw { status: 404, message: 'Room type not found' };

  const existingRooms = await Room.findAll({
    where: { building_id },
    attributes: ['room_number'],
    raw: true,
  });
  const existingNumbers = existingRooms.map(r => r.room_number);

  const roomNumbers = generateRoomNumbers(floor, count, existingNumbers);

  const transaction = await sequelize.transaction();
  try {
    const records = roomNumbers.map(num => ({
      building_id,
      room_type_id,
      room_number: num,
      floor,
      status: 'AVAILABLE',
      thumbnail_url: thumbnail_url || null,
      image_3d_url: image_3d_url || null,
      blueprint_url: blueprint_url || null,
    }));

    const created = await Room.bulkCreate(records, { transaction });

    if (gallery_images && gallery_images.length > 0) {
      const imageRecords = created.flatMap(room =>
        gallery_images.map(url => ({ room_id: room.id, image_url: url }))
      );
      await RoomImage.bulkCreate(imageRecords, { transaction });
    }

    await transaction.commit();

    return {
      count: created.length,
      room_numbers: roomNumbers,
      floor,
      building: { id: building.id, name: building.name },
      room_type: { id: roomType.id, name: roomType.name },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ─── GET /api/rooms/stats ────────────────────────────────────
const getRoomStats = async () => {
  const rooms = await Room.findAll({
    attributes: ['status', 'building_id'],
    include: [{ model: Building, as: 'building', attributes: ['id', 'name'] }],
    raw: true,
    nest: true,
  });

  const byStatus = { available: 0, occupied: 0, locked: 0 };
  const byBuilding = {};

  for (const r of rooms) {
    const key = r.status.toLowerCase();
    byStatus[key] = (byStatus[key] || 0) + 1;
    const bName = r.building?.name || 'Khác';
    const bId = r.building_id;
    if (!byBuilding[bId]) byBuilding[bId] = { building_id: bId, name: bName, count: 0 };
    byBuilding[bId].count++;
  }

  return {
    total: rooms.length,
    by_status: byStatus,
    by_building: Object.values(byBuilding).sort((a, b) => b.count - a.count),
  };
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  createBatchRooms,
  updateRoom,
  deleteRoom,
  toggleRoomStatus,
  getRoomsByBuilding,
  getMyRooms,
  getRoomStats
};
