const { Op } = require('sequelize')
const { sequelize } = require('../config/db')
const RoomType = require('../models/roomType.model')
const Room = require('../models/room.model')
const RoomTypeAsset = require('../models/roomTypeAsset.model')
const AssetType = require('../models/assetType.model')

const getAllRoomTypes = async ({
    page = 1,
    limit = 10,
    is_active,
    search
} = {}, user) => {

    const parsedPage = Number(page)
    const parsedLimit = Number(limit)
    const offset = (parsedPage - 1) * parsedLimit
    const userRole = user?.role || 'PUBLIC'

    const where = {}

    let attributes = undefined
    if (userRole !== 'ADMIN') {
        attributes = { exclude: ['createdAt', 'updatedAt'] }
    }

    if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true
    }

    if (search) {
        where.name = { [Op.iLike]: `%${search}%` }
    }

    const { count, rows } = await RoomType.findAndCountAll({
        where,
        attributes,
        limit: parsedLimit,
        offset,
        order: [['createdAt', 'DESC']]
    })

    const active_count = await RoomType.count({
        where: { ...where, is_active: true }
    });

    return {
        total: count,
        active_count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
        data: rows
    }
}

const getRoomTypeById = async (id, user) => {
    const userRole = user?.role || 'PUBLIC'
    let attributes = undefined
    if (userRole !== 'ADMIN') {
        attributes = { exclude: ['createdAt', 'updatedAt'] }
    }

    const roomType = await RoomType.findByPk(id, { attributes })
    if (!roomType) throw { status: 404, message: 'Không tìm thấy loại phòng' }
    return roomType
}

const createRoomType = async (data) => {

    if (!data.name) {
        throw { status: 400, message: 'Tên loại phòng là bắt buộc' }
    }

    const normalizedName = data.name.trim();

    const duplicate = await RoomType.findOne({
        where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            normalizedName.toLowerCase()
        )
    })

    if (duplicate) {
        throw { status: 409, message: `Loại phòng "${normalizedName}" đã tồn tại` }
    }

    if (data.base_price < 0 || data.base_price > 999999999999) {
        throw { status: 400, message: 'Giá cơ bản phải từ 0 đến 999.999.999.999' }
    }

    // Force deposit_months to 1
    data.deposit_months = 1

    if (data.capacity_min !== undefined && (data.capacity_min < 1 || data.capacity_min > 10)) {
        throw { status: 400, message: 'Sức chứa tối thiểu phải từ 1 đến 10' }
    }

    if (data.capacity_max !== undefined && (data.capacity_max < 1 || data.capacity_max > 10)) {
        throw { status: 400, message: 'Sức chứa tối đa phải từ 1 đến 10' }
    }

    const capacityMin = data.capacity_min || 1
    const capacityMax = data.capacity_max || 1
    if (capacityMin > capacityMax) {
        throw { status: 400, message: 'Sức chứa tối thiểu phải nhỏ hơn hoặc bằng sức chứa tối đa' }
    }

    if (data.bedrooms !== undefined && (data.bedrooms < 1 || data.bedrooms > 10)) {
        throw { status: 400, message: 'Số phòng ngủ phải từ 1 đến 10' }
    }

    if (data.bathrooms !== undefined && (data.bathrooms < 1 || data.bathrooms > 10)) {
        throw { status: 400, message: 'Số phòng tắm phải từ 1 đến 10' }
    }

    if (data.area_sqm !== undefined && (data.area_sqm <= 0 || data.area_sqm > 1000)) {
        throw { status: 400, message: 'Diện tích phải lớn hơn 0 và không quá 1000 m²' }
    }

    const roomType = await RoomType.create({ ...data, name: normalizedName })

    return roomType
}

const updateRoomType = async (id, data) => {

    const roomType = await RoomType.findByPk(id)
    if (!roomType) throw { status: 404, message: 'Không tìm thấy loại phòng' }

    if (data.name && data.name.trim().toLowerCase() !== roomType.name.toLowerCase()) {
        const normalizedName = data.name.trim();
        const duplicate = await RoomType.findOne({
            where: {
                [Op.and]: [
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        normalizedName.toLowerCase()
                    ),
                    { id: { [Op.ne]: id } }
                ]
            }
        })
        if (duplicate) {
            throw { status: 409, message: `Loại phòng "${normalizedName}" đã tồn tại` }
        }
        data.name = normalizedName;
    }

    if (data.base_price !== undefined && (data.base_price < 0 || data.base_price > 999999999999)) {
        throw { status: 400, message: 'Giá cơ bản phải từ 0 đến 999.999.999.999' }
    }

    // Prevent changing deposit_months
    delete data.deposit_months

    if (data.capacity_min !== undefined && (data.capacity_min < 1 || data.capacity_min > 10)) {
        throw { status: 400, message: 'Sức chứa tối thiểu phải từ 1 đến 10' }
    }

    if (data.capacity_max !== undefined && (data.capacity_max < 1 || data.capacity_max > 10)) {
        throw { status: 400, message: 'Sức chứa tối đa phải từ 1 đến 10' }
    }

    const capacityMin = data.capacity_min ?? roomType.capacity_min
    const capacityMax = data.capacity_max ?? roomType.capacity_max
    if (capacityMin > capacityMax) {
        throw { status: 400, message: 'Sức chứa tối thiểu phải nhỏ hơn hoặc bằng sức chứa tối đa' }
    }

    if (data.bedrooms !== undefined && (data.bedrooms < 1 || data.bedrooms > 10)) {
        throw { status: 400, message: 'Số phòng ngủ phải từ 1 đến 10' }
    }

    if (data.bathrooms !== undefined && (data.bathrooms < 1 || data.bathrooms > 10)) {
        throw { status: 400, message: 'Số phòng tắm phải từ 1 đến 10' }
    }

    if (data.area_sqm !== undefined && (data.area_sqm <= 0 || data.area_sqm > 1000)) {
        throw { status: 400, message: 'Diện tích phải lớn hơn 0 và không quá 1000 m²' }
    }

    await roomType.update(data)

    return roomType
}

const deleteRoomType = async (id) => {
    const roomType = await RoomType.findByPk(id)
    if (!roomType) throw { status: 404, message: 'Không tìm thấy loại phòng' }

    const linkedRoomsCount = await Room.count({ where: { room_type_id: id } })
    if (linkedRoomsCount > 0) {
        throw { status: 409, message: `Không thể xóa loại phòng vì còn ${linkedRoomsCount} phòng đang sử dụng` }
    }

    await roomType.destroy() // paranoid: sets deleted_at
    return { message: `Đã xóa loại phòng "${roomType.name}" thành công` }
}

const getTemplateAssets = async (roomTypeId) => {
    const roomType = await RoomType.findByPk(roomTypeId)
    if (!roomType) throw { status: 404, message: 'Không tìm thấy loại phòng' }

    const items = await RoomTypeAsset.findAll({
        where: { room_type_id: roomTypeId },
        include: [{ model: AssetType, as: 'asset_type', attributes: ['id', 'name', 'default_price'] }],
        attributes: ['id', 'quantity']
    })

    return items
}

const replaceTemplateAssets = async (roomTypeId, items) => {
    const roomType = await RoomType.findByPk(roomTypeId)
    if (!roomType) throw { status: 404, message: 'Không tìm thấy loại phòng' }

    if (!Array.isArray(items)) {
        throw { status: 400, message: 'Dữ liệu phải là mảng gồm { asset_type_id, quantity }' }
    }

    if (items.length > 20) {
        throw { status: 400, message: 'Tối đa chỉ được gán 20 loại tài sản cho một loại phòng' }
    }

    // Validate all asset_type_ids exist
    const typeIds = items.map(i => i.asset_type_id)
    const existingTypes = await AssetType.findAll({ where: { id: { [Op.in]: typeIds } } })
    if (existingTypes.length !== typeIds.length) {
        throw { status: 400, message: 'Một hoặc nhiều giá trị asset_type_id không hợp lệ' }
    }

    const transaction = await sequelize.transaction()
    try {
        await RoomTypeAsset.destroy({ where: { room_type_id: roomTypeId }, transaction })

        if (items.length > 0) {
            const records = items.map(item => ({
                room_type_id: roomTypeId,
                asset_type_id: item.asset_type_id,
                quantity: item.quantity || 1
            }))
            await RoomTypeAsset.bulkCreate(records, { transaction })
        }

        await transaction.commit()
        return getTemplateAssets(roomTypeId)
    } catch (error) {
        await transaction.rollback()
        throw error
    }
}

// ─── GET /api/room-types/stats ──────────────────────────────
const getRoomTypeStats = async () => {
    const all = await RoomType.findAll({
        attributes: ['is_active'],
        raw: true,
    })

    let active = 0
    let inactive = 0
    for (const r of all) {
        if (r.is_active) active++
        else inactive++
    }

    return {
        total: all.length,
        by_status: { active, inactive },
    }
}

module.exports = {
    getAllRoomTypes,
    getRoomTypeById,
    createRoomType,
    updateRoomType,
    deleteRoomType,
    getTemplateAssets,
    replaceTemplateAssets,
    getRoomTypeStats
}