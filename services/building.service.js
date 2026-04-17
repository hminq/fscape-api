const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Building = require('../models/building.model');
const Location = require('../models/location.model');
const BuildingImage = require('../models/buildingImage.model');
const Facility = require('../models/facility.model');
const BuildingFacility = require('../models/buildingFacility.model');
const University = require('../models/university.model');
const Room = require('../models/room.model');
const RoomType = require('../models/roomType.model');
const User = require('../models/user.model');
const Contract = require('../models/contract.model');
const Booking = require('../models/booking.model');

const ACTIVE_CONTRACT_STATUSES = [
    'DRAFT', 'PENDING_CUSTOMER_SIGNATURE', 'PENDING_MANAGER_SIGNATURE',
    'PENDING_FIRST_PAYMENT', 'PENDING_CHECK_IN',
    'ACTIVE', 'EXPIRING_SOON'
];
const ACTIVE_BOOKING_STATUSES = ['PENDING', 'DEPOSIT_PAID'];

const getAllBuildings = async ({ page = 1, limit = 10, location_id, search, is_active } = {}, user) => {
    const offset = (page - 1) * limit;
    const where = {};
    const userRole = user?.role || 'PUBLIC';

    // Block Managers and Staff from standard generic /buildings list list 
    // Usually they use a specialized manager portal or get their assigned building directly.
    if (userRole === 'BUILDING_MANAGER' || userRole === 'STAFF') {
        throw { status: 403, message: 'Quản lý và nhân viên phải sử dụng endpoint tòa nhà được phân công' };
    }

    // Public attributes — exclude timestamps for non-admin
    const publicBuildingAttrs = [
        'id', 'location_id', 'name', 'address', 'latitude', 'longitude',
        'description', 'total_floors', 'thumbnail_url', 'is_active'
    ];
    let attributes = undefined; // Admin gets everything
    let facilityThroughAttributes = [];
    let locationAttributes = ['id', 'name'];

    if (userRole !== 'ADMIN') {
        attributes = [...publicBuildingAttrs, 'createdAt']; // keep createdAt for ORDER BY
        facilityThroughAttributes = [];
        locationAttributes = { exclude: ['createdAt', 'updatedAt', 'is_active'] };
    }

    if (location_id) where.location_id = location_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await Building.findAndCountAll({
        where,
        attributes,
        include: [
            { model: Location, as: 'location', attributes: locationAttributes },
            { model: BuildingImage, as: 'images', attributes: ['id', 'image_url'] },
            { model: Facility, as: 'facilities', through: { attributes: facilityThroughAttributes } }
        ],
        limit: Number(limit),
        offset: Number(offset),
        distinct: true,
        order: [['createdAt', 'DESC']]
    });

    // Strip createdAt from public response (it was only kept for ORDER BY)
    const data = userRole !== 'ADMIN'
        ? rows.map(r => { const j = r.toJSON(); delete j.createdAt; return j; })
        : rows;

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data
    };
};

const getBuildingById = async (id, user) => {
    const userRole = user?.role || 'PUBLIC';

    // Block Managers and Staff from fetching any random building if it's not theirs
    if (userRole === 'BUILDING_MANAGER' || userRole === 'STAFF') {
        throw { status: 403, message: 'Quản lý và nhân viên phải sử dụng endpoint tòa nhà được phân công' };
    }

    const publicBuildingAttrs = [
        'id', 'location_id', 'name', 'address', 'latitude', 'longitude',
        'description', 'total_floors', 'thumbnail_url', 'is_active'
    ];
    let attributes = undefined;
    let locationAttributes = undefined;
    let facilityThroughAttributes = [];

    if (userRole !== 'ADMIN') {
        attributes = publicBuildingAttrs;
        locationAttributes = { exclude: ['createdAt', 'updatedAt', 'is_active'] };
        facilityThroughAttributes = [];
    }

    const building = await Building.findByPk(id, {
        attributes,
        include: [
            { model: Location, as: 'location', attributes: locationAttributes },
            { model: BuildingImage, as: 'images', attributes: ['id', 'image_url'] },
            { model: Facility, as: 'facilities', through: { attributes: facilityThroughAttributes } },
            { model: User, as: 'manager', attributes: ['id', 'email', 'first_name', 'last_name', 'phone', 'avatar_url', 'is_active'], where: { role: 'BUILDING_MANAGER' }, required: false }
        ]
    });

    if (!building) throw { status: 404, message: 'Không tìm thấy tòa nhà' };

    const rooms = await Room.findAll({
        where: { building_id: id },
        order: [['floor', 'ASC'], ['room_number', 'ASC']]
    });

    const uniqueRoomTypeIds = [...new Set(rooms.map(room => room.room_type_id))];

    let roomTypes = [];
    if (uniqueRoomTypeIds.length > 0) {
        roomTypes = await RoomType.findAll({
            where: { id: uniqueRoomTypeIds }
        });
    }

    const nearbyUniversities = await University.findAll({
        where: { location_id: building.location_id, is_active: true },
        attributes: ['id', 'name', 'address', 'latitude', 'longitude']
    });

    const buildingData = building.toJSON();
    buildingData.nearby_universities = nearbyUniversities;
    buildingData.rooms = rooms;
    buildingData.room_types = roomTypes;

    return buildingData;
};

const createBuilding = async (data) => {
    const { facilities, images, manager_id, ...buildingData } = data;

    if (images && images.length > 5) {
        throw { status: 400, message: 'Tối đa 5 ảnh' };
    }

    if (facilities && facilities.length > 20) {
        throw { status: 400, message: 'Một tòa nhà chỉ được gán tối đa 20 tiện ích' };
    }

    if (buildingData.total_floors !== undefined && buildingData.total_floors !== null &&
        (buildingData.total_floors < 1 || buildingData.total_floors > 99)) {
        throw { status: 400, message: 'Số tầng phải từ 1 đến 99' };
    }

    // Check for duplicate building name (trim and ignore case)
    const normalizedName = buildingData.name.trim();
    const existing = await Building.findOne({
        where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            normalizedName.toLowerCase()
        )
    });
    if (existing) {
        throw { status: 409, message: `Tòa nhà "${normalizedName}" đã tồn tại` };
    }

    // Validate manager if provided
    if (manager_id) {
        const manager = await User.findByPk(manager_id);
        if (!manager) throw { status: 404, message: 'Không tìm thấy quản lý' };
        if (manager.role !== 'BUILDING_MANAGER') throw { status: 400, message: 'Người dùng được chọn không phải quản lý tòa nhà' };
        if (!manager.is_active) throw { status: 400, message: 'Quản lý được chọn đã bị vô hiệu hóa' };
        if (manager.building_id) throw { status: 400, message: 'Quản lý được chọn đã được phân công tòa nhà khác' };
    }

    const transaction = await sequelize.transaction();

    try {
        const building = await Building.create(buildingData, { transaction });

        if (images && images.length > 0) {
            const imageRecords = images.map(url => ({ building_id: building.id, image_url: url }));
            await BuildingImage.bulkCreate(imageRecords, { transaction });
        }

        if (facilities && facilities.length > 0) {
            const facilityRecords = facilities.map(fId => ({ building_id: building.id, facility_id: fId }));
            await BuildingFacility.bulkCreate(facilityRecords, { transaction });
        }

        if (manager_id) {
            await User.update({ building_id: building.id }, { where: { id: manager_id }, transaction });
        }

        await transaction.commit();
        return getBuildingById(building.id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const updateBuilding = async (id, data) => {
    const { facilities, images, is_active, ...updateData } = data;

    if (images && images.length > 5) {
        throw { status: 400, message: 'Tối đa 5 ảnh' };
    }

    if (facilities && facilities.length > 20) {
        throw { status: 400, message: 'Một tòa nhà chỉ được gán tối đa 20 tiện ích' };
    }

    if (updateData.total_floors !== undefined && updateData.total_floors !== null &&
        (updateData.total_floors < 1 || updateData.total_floors > 99)) {
        throw { status: 400, message: 'Số tầng phải từ 1 đến 99' };
    }

    const building = await Building.findByPk(id);
    if (!building) throw { status: 404, message: 'Không tìm thấy tòa nhà' };

    // Check for duplicate name if renaming (trim and ignore case)
    if (updateData.name && updateData.name.trim() !== building.name) {
        const normalizedName = updateData.name.trim();
        const duplicate = await Building.findOne({
            where: {
                [Op.and]: [
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        normalizedName.toLowerCase()
                    ),
                    { id: { [Op.ne]: id } }
                ]
            }
        });
        if (duplicate) throw { status: 409, message: 'Tên tòa nhà đã tồn tại' };
    }

    const transaction = await sequelize.transaction();
    try {
        await building.update(updateData, { transaction });

        // Sync Images
        if (images) {
            await BuildingImage.destroy({ where: { building_id: id }, transaction });
            await BuildingImage.bulkCreate(images.map(url => ({ building_id: id, image_url: url })), { transaction });
        }

        // Sync Facilities
        if (facilities) {
            await BuildingFacility.destroy({ where: { building_id: id }, transaction });
            await BuildingFacility.bulkCreate(facilities.map(fId => ({ building_id: id, facility_id: fId })), { transaction });
        }

        await transaction.commit();
        return getBuildingById(id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const deleteBuilding = async (id) => {
    const building = await Building.findByPk(id);
    if (!building) throw { status: 404, message: 'Không tìm thấy tòa nhà' };

    // Prevent deletion if the building has existing rooms associated with it
    const roomsCount = await Room.count({ where: { building_id: id } });
    if (roomsCount > 0) {
        throw { status: 400, message: `Không thể xóa tòa nhà vì đang chứa ${roomsCount} phòng. Vui lòng xóa các phòng trước.` };
    }

    // Unassign manager/staff before deletion to avoid FK constraint violation
    await User.update({ building_id: null }, { where: { building_id: id } });

    await building.destroy();
    return { message: `Đã xóa tòa nhà "${building.name}" thành công` };
};

const toggleBuildingStatus = async (id, isActive, user) => {
    const building = await Building.findByPk(id)
    if (!building) throw { status: 404, message: 'Không tìm thấy tòa nhà' }

    if (user && user.role === 'BUILDING_MANAGER' && user.building_id !== building.id) {
        throw { status: 403, message: 'Bạn chỉ được quản lý tòa nhà được phân công' }
    }

    if (building.is_active === isActive) {
        throw { status: 400, message: `Tòa nhà đã ở trạng thái ${isActive ? 'hoạt động' : 'ngừng hoạt động'}` }
    }

    // Block disabling if building has active contracts or bookings
    if (!isActive) {
        const roomIds = (await Room.findAll({
            where: { building_id: id },
            attributes: ['id'],
            raw: true
        })).map(r => r.id);

        if (roomIds.length > 0) {
            const activeContracts = await Contract.count({
                where: { room_id: { [Op.in]: roomIds }, status: { [Op.in]: ACTIVE_CONTRACT_STATUSES } }
            });
            if (activeContracts > 0) {
                throw {
                    status: 409,
                    message: `Không thể vô hiệu hóa tòa nhà. Hiện có ${activeContracts} hợp đồng đang hoạt động.`
                };
            }

            const activeBookings = await Booking.count({
                where: { room_id: { [Op.in]: roomIds }, status: { [Op.in]: ACTIVE_BOOKING_STATUSES } }
            });
            if (activeBookings > 0) {
                throw {
                    status: 409,
                    message: `Không thể vô hiệu hóa tòa nhà. Hiện có ${activeBookings} đặt phòng đang chờ xử lý.`
                };
            }
        }
    }

    building.is_active = isActive
    await building.save()

    return building
}

const getStaffsByBuilding = async (buildingId) => {
  return await User.findAll({
    where: {
      building_id: buildingId,
      role: "STAFF",
      is_active: true
    },
    attributes: [
      "id",
      "email",
      "first_name",
      "last_name",
      "phone",
      "avatar_url",
      "is_active"
    ],
    order: [["created_at", "DESC"]]
  });
};

const getBuildingStats = async () => {
    const buildings = await Building.findAll({
        attributes: ['location_id', 'is_active'],
        include: [{ model: Location, as: 'location', attributes: ['id', 'name'] }],
        raw: true,
        nest: true,
    });

    let active = 0;
    let inactive = 0;
    const byLocation = {};

    for (const b of buildings) {
        if (b.is_active) active++;
        else inactive++;

        const locName = b.location?.name || 'Khác';
        const locId = b.location_id;
        if (!byLocation[locId]) byLocation[locId] = { location_id: locId, name: locName, count: 0 };
        byLocation[locId].count++;
    }

    const by_location = Object.values(byLocation).sort((a, b) => b.count - a.count);

    return { total: buildings.length, active, inactive, by_location };
};

module.exports = {
    getAllBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    toggleBuildingStatus,
    getStaffsByBuilding,
    getBuildingStats
};
