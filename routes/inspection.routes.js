const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const validator = require('../validators/inspection.validator');

const staffOnly = requireRoles(ROLES.STAFF);

// Staff checkout inspection routes
router.post('/preview', authJwt, staffOnly, validator.staffPreview, validate, inspectionController.previewInspection);
router.post('/', authJwt, staffOnly, validator.staffConfirm, validate, inspectionController.confirmInspection);

// Resident self-service check-in routes
router.post('/resident/preview', authJwt, requireRoles(ROLES.RESIDENT), validator.residentPreview, validate, inspectionController.residentPreviewCheckIn);
router.post('/resident/confirm', authJwt, requireRoles(ROLES.RESIDENT), validator.residentConfirm, validate, inspectionController.residentConfirmCheckIn);

module.exports = router;
