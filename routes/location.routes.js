const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const authJwt = require('../middlewares/authJwt');
const requireAdmin = require('../middlewares/requireAdmin');
const validate = require('../middlewares/validateResult');
const validator = require('../validators/location.validator');

router.get('/', locationController.getAllLocations);

router.get('/:id', validator.paramId, validate, locationController.getLocationById);

router.post('/', authJwt, requireAdmin, validator.create, validate, locationController.createLocation);

router.put('/:id', authJwt, requireAdmin, validator.update, validate, locationController.updateLocation);

router.delete('/:id', authJwt, requireAdmin, validator.paramId, validate, locationController.deleteLocation);

router.patch('/:id/status', authJwt, requireAdmin, validator.toggleStatus, validate, locationController.toggleLocationStatus);

module.exports = router;
