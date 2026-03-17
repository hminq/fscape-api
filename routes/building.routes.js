const express = require('express');
const router = express.Router();
const buildingController = require('../controllers/building.controller');
const authJwt = require('../middlewares/authJwt');
const authJwtOptional = require('../middlewares/authJwtOptional');
const requireAdmin = require('../middlewares/requireAdmin');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const validator = require('../validators/building.validator');

router.get('/', authJwtOptional, buildingController.getAllBuildings);
router.get('/stats', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), buildingController.getBuildingStats);

router.get(
  "/:buildingId/staffs",
  buildingController.getStaffsInBuilding
);

router.get('/:id', authJwtOptional, validator.paramId, validate, buildingController.getBuildingById);

router.post(
    '/',
    authJwt,
    requireAdmin,
    validator.create,
    validate,
    buildingController.createBuilding
);

router.put(
    '/:id',
    authJwt,
    requireAdmin,
    validator.update,
    validate,
    buildingController.updateBuilding
);

router.delete('/:id', authJwt, requireAdmin, validator.paramId, validate, buildingController.deleteBuilding);

router.patch('/:id/status', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), validator.toggleStatus, validate, buildingController.toggleBuildingStatus);

module.exports = router;
