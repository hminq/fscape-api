const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const authJwt = require('../middlewares/authJwt');
const validate = require('../middlewares/validateResult');
const validator = require('../validators/upload.validator');

router.post('/', authJwt, validator.upload, validate, uploadController.uploadFiles);

module.exports = router;
