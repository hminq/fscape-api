const express = require('express');
const router = express.Router();

const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/adminUser.controller');
const validator = require('../validators/adminUser.validator');

router.use(authJwt);

router.get('/stats', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), controller.getUserStats);

router.get('/available-managers', requireRoles(ROLES.ADMIN), controller.getAvailableManagers);

router.post('/', requireRoles(ROLES.ADMIN), validator.createUser, validate, controller.createUser);

router.get('/', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), controller.listUsers);

router.patch('/:id/status', requireRoles(ROLES.ADMIN), validator.updateUserStatus, validate, controller.updateUserStatus);

router.patch('/:id/building', requireRoles(ROLES.ADMIN), validator.assignBuilding, validate, controller.assignBuilding);

module.exports = router;
