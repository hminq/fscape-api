const express = require('express');
const router = express.Router();
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const notificationController = require('../controllers/notification.controller');
const validator = require('../validators/notification.validator');

router.use(authJwt);

router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.post('/send', requireRoles(ROLES.BUILDING_MANAGER), validator.send, validate, notificationController.createBmNotification);
router.patch('/:id/read', validator.paramId, validate, notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

module.exports = router;
