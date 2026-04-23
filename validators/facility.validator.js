const { body, param } = require('express-validator');

exports.create = [
  body('name')
    .notEmpty().withMessage('Tên không được để trống')
    .isString()
    .isLength({ min: 1, max: 100 }).withMessage('Tên phải từ 1-100 ký tự'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('Trạng thái hoạt động không hợp lệ'),
];

exports.update = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 }).withMessage('Tên phải từ 1-100 ký tự'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('Trạng thái hoạt động không hợp lệ'),
];

exports.paramId = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
];
