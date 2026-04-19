const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');
const authJwt = require('../middlewares/authJwt');
const requireAdmin = require('../middlewares/requireAdmin');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const validator = require('../validators/asset.validator');

router.get('/', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.STAFF), assetController.getAllAssets);

// Stats - must be before /:id
router.get('/stats', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), assetController.getAssetStats);

router.get('/:id', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.STAFF), validator.paramId, validate, assetController.getAssetById);

router.post('/', authJwt, requireAdmin, validator.create, validate, assetController.createAsset);

router.post('/batch', authJwt, requireAdmin, validator.createBatch, validate, assetController.createBatchAssets);

router.put('/:id', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), validator.update, validate, assetController.updateAsset);

router.patch('/:id/assign', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.STAFF), validator.assign, validate, assetController.assignAsset);

router.delete('/:id', authJwt, requireAdmin, validator.paramId, validate, assetController.deleteAsset);

module.exports = router;
