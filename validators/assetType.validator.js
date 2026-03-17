const { body, param } = require('express-validator');

exports.create = [
  body('name')
    .notEmpty().withMessage('Tên không được để trống')
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tên phải từ 1–255 ký tự'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự'),
  body('default_price')
    .optional()
    .isFloat({ min: 0, max: 500000000 }).withMessage('Giá mặc định phải từ 0–500,000,000'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active phải là boolean'),
];

exports.update = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tên phải từ 1–255 ký tự'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự'),
  body('default_price')
    .optional()
    .isFloat({ min: 0, max: 500000000 }).withMessage('Giá mặc định phải từ 0–500,000,000'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active phải là boolean'),
];

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];
