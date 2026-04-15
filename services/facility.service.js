const { Op } = require('sequelize')
const Facility = require('../models/facility.model')
const Building = require('../models/building.model')
const BuildingFacility = require('../models/buildingFacility.model')
const { sequelize } = require('../config/db')

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

    if (!facility) throw { status: 404, message: 'Không tìm thấy tiện ích' }
    return facility
}

const createFacility = async (data) => {
    const { name, is_active } = data;
    if (!name || !name.trim()) throw { status: 400, message: 'Tên tiện ích không được để trống' };
    const normalizedName = name.trim();

    const duplicate = await Facility.findOne({
        where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            normalizedName.toLowerCase()
        )
    });
    if (duplicate) throw { status: 409, message: `Tiện ích "${normalizedName}" đã tồn tại` };

    const facility = await Facility.create({
        name: normalizedName,
        is_active
    });

    return facility;
};

const updateFacility = async (id, data) => {
    const facility = await Facility.findByPk(id)
    if (!facility) throw { status: 404, message: 'Không tìm thấy tiện ích' }

    if (data.name !== undefined) {
        if (!data.name || !data.name.trim()) {
            throw { status: 400, message: 'Tên tiện ích không được để trống' };
        }
        const normalizedName = data.name.trim();
        if (normalizedName !== facility.name) {
            const duplicate = await Facility.findOne({
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
            if (duplicate) throw { status: 409, message: `Tiện ích "${normalizedName}" đã tồn tại` }
            data.name = normalizedName;
        }
    }

    await facility.update(data)
    return facility
}

const deleteFacility = async (id) => {
    const facility = await Facility.findByPk(id)
    if (!facility) throw { status: 404, message: 'Không tìm thấy tiện ích' }

    const linkedBuildingsCount = await BuildingFacility.count({ where: { facility_id: id } });
    if (linkedBuildingsCount > 0) {
        throw { status: 400, message: `Không thể xóa tiện ích vì đang được gán cho ${linkedBuildingsCount} tòa nhà.` };
    }

    await facility.destroy()
    return { message: `Đã xóa tiện ích "${facility.name}" thành công` }
}

module.exports = {
    getAllFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility
}