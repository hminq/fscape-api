const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlement.controller');
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const validator = require('../validators/settlement.validator');

const staffOrAbove = requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.STAFF);

// GET by contract must come before GET by :id to avoid route conflict
router.get('/contract/:contractId', authJwt, staffOrAbove, validator.paramContractId, validate, settlementController.getSettlementByContract);
router.get('/:id', authJwt, staffOrAbove, validator.paramId, validate, settlementController.getSettlement);
router.patch('/:id/close', authJwt, staffOrAbove, validator.paramId, validate, settlementController.closeSettlement);

module.exports = router;
