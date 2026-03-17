const express = require('express');
const router = express.Router();

const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/auditLog.controller');

router.use(authJwt);

router.get('/', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), controller.list);
router.get('/entity-types', requireRoles(ROLES.ADMIN, ROLES.BUILDING_MANAGER), controller.getEntityTypes);

module.exports = router;
