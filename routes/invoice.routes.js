const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const validator = require('../validators/invoice.validator');
const { ROLES } = require('../constants/roles');

router.use(authJwt);

router.post('/trigger-job', requireRoles(ROLES.ADMIN), invoiceController.triggerInvoiceJob);

router.get('/stats', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), invoiceController.getInvoiceStats);

router.get('/', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), invoiceController.getAllInvoices);

router.get('/my', requireRoles(ROLES.RESIDENT, ROLES.CUSTOMER), invoiceController.getMyInvoices);

router.get('/:id', validator.paramId, validate, invoiceController.getInvoiceById);

module.exports = router;
