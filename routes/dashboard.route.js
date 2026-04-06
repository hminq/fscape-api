const express = require('express');
const router = express.Router();

const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/dashboard.controller');

router.use(authJwt);
router.use(requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER));

router.get('/stats', controller.getDashboardStats);

module.exports = router;