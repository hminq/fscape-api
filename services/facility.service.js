const { Op } = require('sequelize')
const Facility = require('../models/facility.model')
const Building = require('../models/building.model')
const BuildingFacility = require('../models/buildingFacility.model')

const getAllFacilities = async ({ page = 1, limit = 10, search, is_active, building_id } = {}, user) => {
    const offset = (page - 1) * limit
    const where = {}
    const userRole = user?.role || 'PUBLIC'

    if (search) where.name = { [Op.iLike]: `%${search}%` }
    if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === true

    let attributes = undefined
    if (userRole !== 'ADMIN') {
        attributes = { exclude: ['createdAt', 'updatedAt'] }
    }

    const include = []
    if (building_id) {
        include.push({
            model: Building,
            as: 'buildings',
            where: { id: building_id },
            attributes: [],
            through: { attributes: [] }
        })
    }

    const { count, rows } = await Facility.findAndCountAll({
        where,
        attributes,
        include,
        distinct: true,
        limit: Number(limit),
        offset: Number(offset),
        order: [['is_active', 'DESC'], ['name', 'ASC']]
    })

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows
    }
}

const getFacilityById = async (id) => {
    const facility = await Facility.findByPk(id, {
        include: [{
            model: Building,
            as: 'buildings',
            attributes: ['id', 'name'],
            through: { attributes: ['is_active'] }
        }]
    })

    if (!facility) throw { status: 404, message: 'Facility not found' }
    return facility
}

const createFacility = async (data) => {
    const { name, is_active } = data;

    // Check duplicate name
    const duplicate = await Facility.findOne({ where: { name } });
    if (duplicate) throw { status: 409, message: `Facility "${name}" already exists` };

    const facility = await Facility.create({
        name,
        is_active
    });

    return facility;
};

const updateFacility = async (id, data) => {
    const facility = await Facility.findByPk(id)
    if (!facility) throw { status: 404, message: 'Facility not found' }

    if (data.name && data.name !== facility.name) {
        const duplicate = await Facility.findOne({
            where: { name: data.name, id: { [Op.ne]: id } }
        })
        if (duplicate) throw { status: 409, message: `Facility "${data.name}" already exists` }
    }

    await facility.update(data)
    return facility
}

const deleteFacility = async (id) => {
    const facility = await Facility.findByPk(id)
    if (!facility) throw { status: 404, message: 'Facility not found' }

    const linkedBuildingsCount = await BuildingFacility.count({ where: { facility_id: id } });
    if (linkedBuildingsCount > 0) {
        throw { status: 400, message: `Facility cannot be deleted because it is assigned to ${linkedBuildingsCount} building(s).` };
    }

    await facility.destroy()
    return { message: `Facility "${facility.name}" deleted successfully` }
}

module.exports = {
    getAllFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility
}