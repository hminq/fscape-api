const { Op } = require('sequelize');
const University = require('../models/university.model');
const Location = require('../models/location.model');
const Building = require('../models/building.model');

/**
 * Lấy danh sách trường đại học kèm phân trang và khu vực
 */
const getAllUniversities = async ({ page = 1, limit = 10, location_id, is_active, search } = {}) => {
    const offset = (page - 1) * limit;
    const where = {};

    if (location_id) where.location_id = location_id;
    if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === true;
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await University.findAndCountAll({
        where,
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: [
            { model: Location, as: 'location', attributes: ['id', 'name'] }
        ],
        limit: Number(limit),
        offset: Number(offset),
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
 * Lấy chi tiết trường đại học và các tòa nhà lân cận (cùng location_id)
 */
const getUniversityById = async (id) => {
    const university = await University.findByPk(id, {
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: [
            {
                model: Location,
                as: 'location',
                attributes: { exclude: ['createdAt', 'updatedAt', 'is_active'] }
            }
        ]
    });

    if (!university) throw { status: 404, message: 'University not found' };

    const nearbyBuildings = await Building.findAll({
        where: {
            location_id: university.location_id,
            is_active: true
        },
        attributes: ['id', 'name', 'address', 'thumbnail_url', 'latitude', 'longitude']
    });

    const universityData = university.toJSON();
    universityData.nearby_buildings = nearbyBuildings;

    return universityData;
};

const createUniversity = async (data) => {
    const { name, location_id, address } = data;

    if (!name) throw { status: 400, message: 'University name is required' };
    if (!location_id) throw { status: 400, message: 'Location ID is required' };
    if (!address) throw { status: 400, message: 'Address is required' };

    const existing = await University.findOne({ where: { name } });
    if (existing) throw { status: 409, message: `University "${name}" already exists` };

    return await University.create(data);
};

const updateUniversity = async (id, data) => {
    const university = await University.findByPk(id);
    if (!university) throw { status: 404, message: 'University not found' };

    if (data.name !== undefined && !data.name) throw { status: 400, message: 'University name cannot be empty' };
    if (data.location_id !== undefined && !data.location_id) throw { status: 400, message: 'Location ID cannot be empty' };
    if (data.address !== undefined && !data.address) throw { status: 400, message: 'Address cannot be empty' };

    if (data.name && data.name !== university.name) {
        const duplicate = await University.findOne({ where: { name: data.name, id: { [Op.ne]: id } } });
        if (duplicate) throw { status: 409, message: 'University name already exists' };
    }

    // Restrict what can be updated via generic PUT
    const { is_active, ...allowedUpdateData } = data;

    return await university.update(allowedUpdateData);
};

const deleteUniversity = async (id) => {
    const university = await University.findByPk(id);
    if (!university) throw { status: 404, message: 'University not found' };

    await university.destroy();
    return { message: `University "${university.name}" deleted successfully` };
};

const toggleUniversityStatus = async (id, isActive) => {
    const university = await University.findByPk(id)
    if (!university) throw { status: 404, message: 'University not found' }

    if (university.is_active === isActive) {
        throw { status: 400, message: `University is already ${isActive ? 'active' : 'inactive'}` }
    }

    university.is_active = isActive
    await university.save()

    return university
}

module.exports = {
    getAllUniversities,
    getUniversityById,
    createUniversity,
    updateUniversity,
    deleteUniversity,
    toggleUniversityStatus
};