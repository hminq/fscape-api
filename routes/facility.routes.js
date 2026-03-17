const express = require('express')
const router = express.Router()
const facilityController = require('../controllers/facility.controller')
const authJwt = require('../middlewares/authJwt')
const authJwtOptional = require('../middlewares/authJwtOptional')
const requireAdmin = require('../middlewares/requireAdmin')
const validate = require('../middlewares/validateResult')
const validator = require('../validators/facility.validator')

router.get('/', authJwtOptional, facilityController.getAllFacilities)

router.get('/:id', authJwt, requireAdmin, validator.paramId, validate, facilityController.getFacilityById)

router.post('/', authJwt, requireAdmin, validator.create, validate, facilityController.createFacility)

router.put('/:id', authJwt, requireAdmin, validator.update, validate, facilityController.updateFacility)

router.delete('/:id', authJwt, requireAdmin, validator.paramId, validate, facilityController.deleteFacility)

module.exports = router
