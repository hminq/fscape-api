const locationService = require('../services/location.service');

/**
 * Lấy danh sách khu vực (Kèm phân trang và lọc)
 */
const getAllLocations = async (req, res) => {
    try {
        const { page, limit, search, is_active } = req.query;

        const result = await locationService.getAllLocations({
            page,
            limit,
            search,
            is_active
        });

        return res.status(200).json({
            message: "Lấy danh sách khu vực thành công",
            ...result
        });
    } catch (error) {
        console.error("LocationController getAllLocations:", error);
        return res.status(error.status || 500).json({
            message: error.message || "Lỗi hệ thống"
        });
    }
};

/**
 * Lấy chi tiết một khu vực
 */
const getLocationById = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await locationService.getLocationById(id);

        return res.status(200).json({
            data: location
        });
    } catch (error) {
        console.error(`LocationController getLocationById (${req.params.id}):`, error);
        return res.status(error.status || 500).json({
            message: error.message || "Lỗi hệ thống"
        });
    }
};

/**
 * Tạo mới khu vực
 */
const createLocation = async (req, res) => {
    try {
        const location = await locationService.createLocation(req.body);

        return res.status(201).json({
            message: "Tạo khu vực thành công",
            data: location
        });
    } catch (error) {
        console.error("LocationController createLocation:", error);
        return res.status(error.status || 500).json({
            message: error.message || "Lỗi hệ thống"
        });
    }
};

/**
 * Cập nhật khu vực
 */
const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedLocation = await locationService.updateLocation(id, req.body);

        return res.status(200).json({
            message: "Cập nhật khu vực thành công",
            data: updatedLocation
        });
    } catch (error) {
        console.error(`LocationController updateLocation (${req.params.id}):`, error);
        return res.status(error.status || 500).json({
            message: error.message || "Lỗi hệ thống"
        });
    }
};

/**
 * Xóa khu vực
 */
const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await locationService.deleteLocation(id);

        return res.status(200).json({
            ...result
        });
    } catch (error) {
        console.error(`LocationController deleteLocation (${req.params.id}):`, error);
        return res.status(error.status || 500).json({
            message: error.message || "Lỗi hệ thống"
        });
    }
};

const toggleLocationStatus = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            console.warn('[LocationController] toggleLocationStatus: is_active is not boolean');
            return res.status(400).json({
                message: 'Dữ liệu không hợp lệ'
            });
        }

        const location = await locationService.toggleLocationStatus(req.params.id, is_active)
        return res.status(200).json({
            message: 'Cập nhật trạng thái khu vực thành công',
            data: location
        })
    } catch (err) {
        return res.status(err.status || 500).json({
            message: err.message || "Lỗi hệ thống"
        });
    }
}

module.exports = {
    getAllLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationStatus
};
