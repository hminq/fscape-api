const express = require('express');
const router = express.Router();

const authJwt = require('../middlewares/authJwt');
const validate = require('../middlewares/validateResult');
const validator = require('../validators/userProfile.validator');
const userController = require('../controllers/userProfile.controller');

router.get('/me', authJwt, userController.getProfile);

router.put('/me', authJwt, validator.updateProfile, validate, userController.updateProfile);

module.exports = router;
