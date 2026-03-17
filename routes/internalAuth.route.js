const express = require('express');
const router = express.Router();

const controller = require('../controllers/internalAuth.controller');
const validator = require('../validators/internalAuth.validator');
const validate = require('../middlewares/validateResult');
const authJwt = require('../middlewares/authJwt');

router.post('/login', validator.login, validate, controller.login);

router.post('/change-password', authJwt, validator.changePassword, validate, controller.changePassword);

module.exports = router;
