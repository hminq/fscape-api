const { body, param } = require('express-validator');

exports.create = [
  body('name')
    .notEmpty().withMessage('Tên không được để trống')
    .isString()
    .isLength({ min: 1, max: 100 }).withMessage('Tên phải từ 1–100 ký tự'),
];

exports.update = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 }).withMessage('Tên phải từ 1–100 ký tự'),
];

exports.toggleStatus = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('is_active')
    .isBoolean().withMessage('is_active phải là boolean'),
];

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];
