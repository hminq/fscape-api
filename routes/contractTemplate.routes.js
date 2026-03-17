const express = require('express');
const router = express.Router();
const controller = require('../controllers/contractTemplate.controller');
const authJwt = require('../middlewares/authJwt');
const requireAdmin = require('../middlewares/requireAdmin');
const validate = require('../middlewares/validateResult');
const validator = require('../validators/contractTemplate.validator');

router.get('/', authJwt, requireAdmin, controller.getAllTemplates);

router.get('/:id', authJwt, requireAdmin, validator.paramId, validate, controller.getTemplateById);

router.post('/', authJwt, requireAdmin, validator.create, validate, controller.createTemplate);

router.put('/:id', authJwt, requireAdmin, validator.update, validate, controller.updateTemplate);

router.delete('/:id', authJwt, requireAdmin, validator.paramId, validate, controller.deleteTemplate);

module.exports = router;
