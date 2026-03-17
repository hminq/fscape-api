const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contract.controller');
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const validator = require('../validators/contract.validator');

router.use(authJwt);

// List all contracts — ADMIN (full + timestamps), BM (scoped to building, no timestamps)
router.get('/', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), contractController.getAllContracts);

// My contracts — RESIDENT / CUSTOMER
router.get('/my', requireRoles(ROLES.RESIDENT, ROLES.CUSTOMER), contractController.getMyContracts);

// Stats — must be before /:id
router.get('/stats', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), contractController.getContractStats);

// Contract detail — ADMIN / BM / RESIDENT / CUSTOMER
router.get('/:id', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.RESIDENT, ROLES.CUSTOMER), validator.paramId, validate, contractController.getContractById);

// No POST
// No DELETE

// Update contract — ADMIN / BM (extend duration, adjust end_date, etc.)
router.put('/:id', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), validator.update, validate, contractController.updateContract);

// Resident renews their contract (ACTIVE/EXPIRING_SOON → new PENDING_CUSTOMER_SIGNATURE)
router.post('/:id/renew', requireRoles(ROLES.RESIDENT), validator.renew, validate, contractController.renewContract);

// Customer/Resident signs contract (PENDING_CUSTOMER_SIGNATURE → PENDING_MANAGER_SIGNATURE)
router.patch('/:id/sign', requireRoles(ROLES.RESIDENT, ROLES.CUSTOMER), validator.customerSign, validate, contractController.customerSign);

// Building Manager signs contract (PENDING_MANAGER_SIGNATURE → ACTIVE)
router.patch('/:id/manager-sign', requireRoles(ROLES.BUILDING_MANAGER), validator.managerSign, validate, contractController.managerSign);

module.exports = router;
