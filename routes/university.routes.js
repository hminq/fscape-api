const express = require('express');
const router = express.Router();
const universityController = require('../controllers/university.controller');
const authJwt = require('../middlewares/authJwt');
const requireAdmin = require('../middlewares/requireAdmin');
const validate = require('../middlewares/validateResult');
const validator = require('../validators/university.validator');

router.get('/', universityController.getAllUniversities);

router.get('/:id', validator.paramId, validate, universityController.getUniversityById);

router.post('/', authJwt, requireAdmin, validator.create, validate, universityController.createUniversity);

router.put('/:id', authJwt, requireAdmin, validator.update, validate, universityController.updateUniversity);

router.delete('/:id', authJwt, requireAdmin, validator.paramId, validate, universityController.deleteUniversity);

router.patch('/:id/status', authJwt, requireAdmin, validator.toggleStatus, validate, universityController.toggleUniversityStatus);

module.exports = router;
