const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const authJwt = require('../middlewares/authJwt');
const authJwtOptional = require('../middlewares/authJwtOptional');
const requireAdmin = require('../middlewares/requireAdmin');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const validator = require('../validators/room.validator');

router.get('/', authJwtOptional, roomController.getAllRooms);

// Stats - ADMIN / BUILDING_MANAGER only (must be before /:id)
router.get('/stats', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), roomController.getRoomStats);

// My rooms - CUSTOMER / RESIDENT only (must be before /:id)
router.get('/my', authJwt, requireRoles(ROLES.CUSTOMER, ROLES.RESIDENT), roomController.getMyRooms);

router.get('/:id', authJwtOptional, validator.paramId, validate, roomController.getRoomById);

router.get("/building/:building_id",
  authJwt,
  requireRoles(ROLES.BUILDING_MANAGER),
  validator.paramBuildingId,
  validate,
  roomController.getRoomsByBuilding
);

router.post('/batch', authJwt, requireAdmin, validator.createBatch, validate, roomController.createBatchRooms);

router.post('/', authJwt, requireAdmin, validator.create, validate, roomController.createRoom);

router.put('/:id', authJwt, requireAdmin, validator.update, validate, roomController.updateRoom);

router.delete('/:id', authJwt, requireAdmin, validator.paramId, validate, roomController.deleteRoom);

router.patch(
  '/:id/status',
  authJwt,
  requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER),
  validator.toggleStatus,
  validate,
  roomController.toggleRoomStatus
);

module.exports = router;
