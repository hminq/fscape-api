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

    if (!location) throw { status: 404, message: 'Không tìm thấy khu vực' };
    return location;
};

/**
 * Tạo địa điểm mới
 */
const createLocation = async (data) => {
    const { Location } = sequelize.models;
    const { name } = data;
    const normalizedName = name.trim();
    const existing = await Location.findOne({
        where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            normalizedName.toLowerCase()
        )
    });
    if (existing) throw { status: 409, message: `Khu vực "${normalizedName}" đã tồn tại` };

    return await Location.create({ ...data, name: normalizedName });
};

/**
 * Cập nhật địa điểm
 */
const updateLocation = async (id, data) => {
    const { Location } = sequelize.models;
    const location = await Location.findByPk(id);
    if (!location) throw { status: 404, message: 'Không tìm thấy khu vực' };

    if (data.name && data.name.trim() !== location.name) {
        const normalizedName = data.name.trim();
        const duplicate = await Location.findOne({
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
        if (duplicate) throw { status: 409, message: `Khu vực "${normalizedName}" đã tồn tại` };
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
    if (!location) throw { status: 404, message: 'Không tìm thấy khu vực' };

    const [buildingsCount, universitiesCount] = await Promise.all([
        Building.count({ where: { location_id: id } }),
        University.count({ where: { location_id: id } })
    ]);

    if (buildingsCount > 0 || universitiesCount > 0) {
        throw {
            status: 400,
            message: 'Không thể xóa khu vực: Vẫn còn dữ liệu liên kết.'
        };
    }

    await location.destroy();
    return { message: `Đã xóa khu vực "${location.name}" thành công` };
};

const toggleLocationStatus = async (id, isActive) => {
    const { Location } = sequelize.models;
    const location = await Location.findByPk(id)
    if (!location) throw { status: 404, message: 'Không tìm thấy khu vực' }

    if (location.is_active === isActive) {
        throw { status: 400, message: `Khu vực đã ở trạng thái ${isActive ? 'hoạt động' : 'vô hiệu hóa'}` }
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
