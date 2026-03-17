const express = require('express');
const router = express.Router();
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const requestController = require('../controllers/request.controller');
const validator = require('../validators/request.validator');

router.use(authJwt);

router.get('/stats', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), requestController.getRequestStats);

router.get('/', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.STAFF, ROLES.RESIDENT), requestController.getAllRequests);

router.get('/my', requireRoles(ROLES.RESIDENT), requestController.getMyRequests);

router.get('/:id', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.STAFF, ROLES.RESIDENT), validator.paramId, validate, requestController.getRequestById);

router.post('/', requireRoles(ROLES.RESIDENT), validator.create, validate, requestController.createRequest);

router.patch('/:id/assign', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), validator.assign, validate, requestController.assignRequest);

router.patch('/:id/status', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.STAFF, ROLES.RESIDENT), validator.updateStatus, validate, requestController.updateRequestStatus);

module.exports = router;
