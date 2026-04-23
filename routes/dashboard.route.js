const express = require('express');
const router = express.Router();

const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/dashboard.controller');

router.use(authJwt);

router.get('/', requireRoles(ROLES.ADMIN), controller.getDashboard);
router.get('/building-manager', requireRoles(ROLES.BUILDING_MANAGER), controller.getBuildingManagerDashboard);

module.exports = router;
