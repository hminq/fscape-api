const requestService = require('../services/request.service');

const handleError = (res, err) => {
    console.error('[RequestController]', err);
    const status = err.status || 500;
    const message = err.message || 'Lỗi hệ thống';
    return res.status(status).json({ message });
};

const getAllRequests = async (req, res) => {
    try {
        const result = await requestService.getAllRequests(req.user, req.query);
        return res.status(200).json({ ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

const getMyRequests = async (req, res) => {
    try {
        const result = await requestService.getMyRequests(req.user.id, req.query);
        return res.status(200).json({ ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

const getRequestById = async (req, res) => {
    try {
        const request = await requestService.getRequestById(req.user, req.params.id);
        return res.status(200).json({ data: request });
    } catch (err) {
        return handleError(res, err);
    }
};

// Resident tạo Request
const createRequest = async (req, res) => {
    try {
        const requestData = { ...req.body };

        // Force resident_id from JWT
        requestData.resident_id = req.user.id;

        if (!requestData.room_id || !requestData.request_type || !requestData.title) {
            console.warn('[RequestController] createRequest: missing required fields');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }

        // image_urls now comes pre-uploaded from the client
        requestData.imageUrls = requestData.image_urls || [];

        const request = await requestService.createRequest(requestData);

        return res.status(201).json({
            message: 'Tạo yêu cầu thành công',
            data: request
        });
    } catch (err) {
        return handleError(res, err);
    }
};

// Manager gán việc cho Staff
const assignRequest = async (req, res) => {
    try {
        const { assigned_staff_id } = req.body;

        if (!assigned_staff_id) {
            console.warn('[RequestController] assignRequest: missing assigned_staff_id');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }

        const request = await requestService.assignRequest(req.params.id, assigned_staff_id, req.user.id);

        return res.status(200).json({
            message: 'Phân công yêu cầu thành công',
            data: request
        });
    } catch (err) {
        return handleError(res, err);
    }
};

const updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        updateData.changed_by = req.user.id;
        updateData.caller_role = req.user.role;

        if (!updateData.status) {
            console.warn('[RequestController] updateRequestStatus: missing status');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }

        updateData.completionImages = updateData.completion_images || [];

        const request = await requestService.updateRequestStatus(id, updateData);

        return res.status(200).json({
            message: `Đã cập nhật trạng thái yêu cầu thành ${updateData.status}`,
            data: request
        });
    } catch (err) {
        return handleError(res, err);
    }
};

const getRequestStats = async (req, res) => {
    try {
        const stats = await requestService.getRequestStats(req.user);
        return res.status(200).json({ data: stats });
    } catch (err) {
        return handleError(res, err);
    }
};

module.exports = {
    getAllRequests,
    getMyRequests,
    getRequestById,
    createRequest,
    assignRequest,
    updateRequestStatus,
    getRequestStats
};
