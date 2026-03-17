const { body, param } = require('express-validator');

exports.create = [
  body('name')
    .notEmpty().withMessage('Tên không được để trống')
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tên phải từ 1–255 ký tự'),
  body('version')
    .notEmpty().withMessage('Phiên bản không được để trống')
    .isString()
    .isLength({ min: 1, max: 20 }).withMessage('Phiên bản phải từ 1–20 ký tự'),
  body('content')
    .notEmpty().withMessage('Nội dung không được để trống')
    .isString()
    .isLength({ max: 100000 }).withMessage('Nội dung tối đa 100,000 ký tự'),
  body('variables')
    .optional()
    .isArray().withMessage('variables phải là mảng'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active phải là boolean'),
  body('is_default')
    .optional()
    .isBoolean().withMessage('is_default phải là boolean'),
];

exports.update = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tên phải từ 1–255 ký tự'),
  body('version')
    .optional()
    .isString()
    .isLength({ min: 1, max: 20 }).withMessage('Phiên bản phải từ 1–20 ký tự'),
  body('content')
    .optional()
    .isString()
    .isLength({ max: 100000 }).withMessage('Nội dung tối đa 100,000 ký tự'),
  body('variables')
    .optional()
    .isArray().withMessage('variables phải là mảng'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active phải là boolean'),
  body('is_default')
    .optional()
    .isBoolean().withMessage('is_default phải là boolean'),
];

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];
