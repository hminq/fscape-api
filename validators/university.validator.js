const { body, param } = require('express-validator');

exports.create = [
  body('name')
    .notEmpty().withMessage('Tên không được để trống')
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tên phải từ 1–255 ký tự'),
  body('location_id')
    .notEmpty().withMessage('Vui lòng chọn khu vực')
    .isUUID().withMessage('Mã khu vực không hợp lệ'),
  body('address')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Địa chỉ tối đa 500 ký tự'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Vĩ độ phải từ -90 đến 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Kinh độ phải từ -180 đến 180'),
];

exports.update = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tên phải từ 1–255 ký tự'),
  body('location_id')
    .optional()
    .isUUID().withMessage('Mã khu vực không hợp lệ'),
  body('address')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Địa chỉ tối đa 500 ký tự'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Vĩ độ phải từ -90 đến 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Kinh độ phải từ -180 đến 180'),
];

exports.toggleStatus = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('is_active')
    .isBoolean().withMessage('Trạng thái hoạt động không hợp lệ'),
];

exports.paramId = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
];
