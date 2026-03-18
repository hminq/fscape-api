const roomTypeService = require('../services/roomType.service')

const handleError = (res, err) => {
    console.error('[RoomTypeController]', err)
    const status = err.status || 500
    const message = err.message || 'Lỗi hệ thống'
    return res.status(status).json({ message })
}

const getAllRoomTypes = async (req, res) => {
    try {
        const result = await roomTypeService.getAllRoomTypes(req.query, req.user)
        return res.status(200).json({ ...result })
    } catch (err) {
        return handleError(res, err)
    }
}

const getRoomTypeById = async (req, res) => {
    try {
        const data = await roomTypeService.getRoomTypeById(req.params.id, req.user)
        return res.status(200).json({ data })
    } catch (err) {
        return handleError(res, err)
    }
}

const createRoomType = async (req, res) => {
    try {
        const data = await roomTypeService.createRoomType(req.body)
        return res.status(201).json({
            message: 'Tạo loại phòng thành công',
            data
        })
    } catch (err) {
        return handleError(res, err)
    }
}

const updateRoomType = async (req, res) => {
    try {
        const data = await roomTypeService.updateRoomType(req.params.id, req.body)
        return res.status(200).json({
            message: 'Cập nhật loại phòng thành công',
            data
        })
    } catch (err) {
        return handleError(res, err)
    }
}

const deleteRoomType = async (req, res) => {
    try {
        const result = await roomTypeService.deleteRoomType(req.params.id)
        return res.status(200).json({ ...result })
    } catch (err) {
        return handleError(res, err)
    }
}

const getTemplateAssets = async (req, res) => {
    try {
        const data = await roomTypeService.getTemplateAssets(req.params.id)
        return res.status(200).json({ data })
    } catch (err) {
        return handleError(res, err)
    }
}

const replaceTemplateAssets = async (req, res) => {
    try {
        const data = await roomTypeService.replaceTemplateAssets(req.params.id, req.body)
        return res.status(200).json({ message: 'Cập nhật mẫu tài sản thành công', data })
    } catch (err) {
        return handleError(res, err)
    }
}

const getRoomTypeStats = async (req, res) => {
    try {
        const stats = await roomTypeService.getRoomTypeStats()
        return res.status(200).json({ data: stats })
    } catch (err) {
        return handleError(res, err)
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