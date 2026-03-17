const notificationService = require('../services/notification.service');

const handleError = (res, err) => {
    console.error('[NotificationController]', err);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
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
            return res.status(404).json({ message: 'Notification not found' });
        }
        return res.status(200).json({ message: 'Notification marked as read', data: recipient });
    } catch (err) {
        return handleError(res, err);
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        return res.status(200).json({ message: 'All notifications marked as read' });
    } catch (err) {
        return handleError(res, err);
    }
};

const createBmNotification = async (req, res) => {
    try {
        const { title, content, target, room_id } = req.body;

        if (!title || !content || !target) {
            return res.status(400).json({ message: 'Missing required fields: title, content, target' });
        }

        const result = await notificationService.createBmNotification(req.user, { title, content, target, room_id });

        return res.status(201).json({
            message: `Notification sent to ${result.recipient_count} resident(s)`,
            data: result.notification
        });
    } catch (err) {
        return handleError(res, err);
    }
};

module.exports = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createBmNotification
};
