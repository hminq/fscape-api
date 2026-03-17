const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Lấy danh sách địa điểm
 */
const getAllLocations = async ({ page = 1, limit = 10, search, is_active } = {}) => {
    const { Location, Building, University } = sequelize.models;

    const offset = (page - 1) * limit;
    const where = {};

    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
    }

    const { count, rows } = await Location.findAndCountAll({
        where,
        include: [
            { model: Building, as: 'buildings', attributes: ['id'] },
            { model: University, as: 'universities', attributes: ['id'] }
        ],
        limit: Number(limit),
        offset: Number(offset),
        distinct: true,
        order: [['name', 'ASC']]
    });

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows
    };
};

/**
 * Lấy chi tiết 1 địa điểm
 */
const getLocationById = async (id) => {
    const { Location, Building, University } = sequelize.models;

    const location = await Location.findByPk(id, {
        include: [
            { model: Building, as: 'buildings' },
            { model: University, as: 'universities' }
        ]
    });

    if (!location) throw { status: 404, message: 'Location not found' };
    return location;
};

/**
 * Tạo địa điểm mới
 */
const createLocation = async (data) => {
    const { Location } = sequelize.models;
    const { name } = data;

    const existing = await Location.findOne({ where: { name } });
    if (existing) throw { status: 409, message: `Location "${name}" already exists` };

    return await Location.create(data);
};

/**
 * Cập nhật địa điểm
 */
const updateLocation = async (id, data) => {
    const { Location } = sequelize.models;
    const location = await Location.findByPk(id);
    if (!location) throw { status: 404, message: 'Location not found' };

    if (data.name && data.name !== location.name) {
        const duplicate = await Location.findOne({
            where: { name: data.name, id: { [Op.ne]: id } }
        });
        if (duplicate) throw { status: 409, message: `Location "${data.name}" already exists` };
    }

    // Restrict what can be updated via generic PUT (e.g., prevent changing is_active)
    const { is_active, ...allowedUpdateData } = data;

    return await location.update(allowedUpdateData);
};

/**
 * Xóa địa điểm
 */
const deleteLocation = async (id) => {
    const { Location, Building, University } = sequelize.models;
    const location = await Location.findByPk(id);
    if (!location) throw { status: 404, message: 'Location not found' };

    const [buildingsCount, universitiesCount] = await Promise.all([
        Building.count({ where: { location_id: id } }),
        University.count({ where: { location_id: id } })
    ]);

    if (buildingsCount > 0 || universitiesCount > 0) {
        throw {
            status: 400,
            message: 'Cannot delete location: Associated data exists.'
        };
    }

    await location.destroy();
    return { message: `Location "${location.name}" deleted successfully` };
};

const toggleLocationStatus = async (id, isActive) => {
    const { Location } = sequelize.models;
    const location = await Location.findByPk(id)
    if (!location) throw { status: 404, message: 'Location not found' }

    if (location.is_active === isActive) {
        throw { status: 400, message: `Location is already ${isActive ? 'active' : 'inactive'}` }
    }

    location.is_active = isActive
    await location.save()

    return location
}

module.exports = {
    getAllLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationStatus
};