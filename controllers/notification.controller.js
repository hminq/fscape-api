const notificationService = require('../services/notification.service');

const handleError = (res, err) => {
    console.error('[NotificationController]', err);
    const status = err.status || 500;
    const message = err.message || 'Lỗi hệ thống';
    return res.status(status).json({ message });
};

const getMyNotifications = async (req, res) => {
    try {
        const result = await notificationService.getUserNotifications(req.user.id, req.query);
        return res.status(200).json({ ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const count = await notificationService.getUnreadCount(req.user.id);
        return res.status(200).json({ count });
    } catch (err) {
        return handleError(res, err);
    }
};

const markAsRead = async (req, res) => {
    try {
        const recipient = await notificationService.markAsRead(req.params.id, req.user.id);
        if (!recipient) {
            return res.status(404).json({ message: 'Không tìm thấy thông báo' });
        }
        return res.status(200).json({ message: 'Đã đánh dấu thông báo là đã đọc', data: recipient });
    } catch (err) {
        return handleError(res, err);
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        return res.status(200).json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
    } catch (err) {
        return handleError(res, err);
    }
};

const createBmNotification = async (req, res) => {
    try {
        const { title, content, target, room_id } = req.body;

        if (!title || !content || !target) {
            console.warn('[NotificationController] createBmNotification: missing required fields');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }

        const result = await notificationService.createBmNotification(req.user, { title, content, target, room_id });

        return res.status(201).json({
            message: `Đã gửi thông báo đến ${result.recipient_count} cư dân`,
            data: result.notification
        });
    } catch (err) {
        return handleError(res, err);
    }
};

const getAllNotifications = async (req, res) => {
    try {
        const result = await notificationService.getAllNotifications(req.query);
        return res.status(200).json({ ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

module.exports = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createBmNotification,
    getAllNotifications
};
