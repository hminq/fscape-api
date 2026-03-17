const express = require('express');
const router = express.Router();
const assetTypeController = require('../controllers/assetType.controller');
const authJwt = require('../middlewares/authJwt');
const requireAdmin = require('../middlewares/requireAdmin');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const validator = require('../validators/assetType.validator');

router.get('/', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.STAFF), assetTypeController.getAllAssetTypes);

// Stats — must be before /:id
router.get('/stats', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), assetTypeController.getAssetTypeStats);

router.get('/:id', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.STAFF), validator.paramId, validate, assetTypeController.getAssetTypeById);

router.post('/', authJwt, requireAdmin, validator.create, validate, assetTypeController.createAssetType);

router.put('/:id', authJwt, requireAdmin, validator.update, validate, assetTypeController.updateAssetType);

router.delete('/:id', authJwt, requireAdmin, validator.paramId, validate, assetTypeController.deleteAssetType);

module.exports = router;
