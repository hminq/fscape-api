const express = require('express')
const router = express.Router()
const roomTypeController = require('../controllers/roomType.controller')
const authJwt = require('../middlewares/authJwt')
const authJwtOptional = require('../middlewares/authJwtOptional')
const requireAdmin = require('../middlewares/requireAdmin')
const requireRoles = require('../middlewares/requireRoles')
const validate = require('../middlewares/validateResult')
const { ROLES } = require('../constants/roles')
const validator = require('../validators/roomType.validator')

router.get('/', authJwtOptional, roomTypeController.getAllRoomTypes)

// Stats - must be before /:id
router.get('/stats', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), roomTypeController.getRoomTypeStats)

router.get('/:id', authJwtOptional, validator.paramId, validate, roomTypeController.getRoomTypeById)

router.post('/', authJwt, requireAdmin, validator.create, validate, roomTypeController.createRoomType)

router.put('/:id', authJwt, requireAdmin, validator.update, validate, roomTypeController.updateRoomType)

router.delete('/:id', authJwt, requireAdmin, validator.paramId, validate, roomTypeController.deleteRoomType)

// Template assets
router.get('/:id/assets', authJwt, requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), validator.paramId, validate, roomTypeController.getTemplateAssets)
router.put('/:id/assets', authJwt, requireAdmin, validator.replaceTemplateAssets, validate, roomTypeController.replaceTemplateAssets)

module.exports = router
