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
    .notEmpty().withMessage('Địa chỉ không được để trống')
    .isString()
    .isLength({ max: 500 }).withMessage('Địa chỉ tối đa 500 ký tự'),
  body('latitude')
    .notEmpty().withMessage('Vĩ độ không được để trống')
    .isFloat({ min: -90, max: 90 }).withMessage('Vĩ độ phải từ -90 đến 90'),
  body('longitude')
    .notEmpty().withMessage('Kinh độ không được để trống')
    .isFloat({ min: -180, max: 180 }).withMessage('Kinh độ phải từ -180 đến 180'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự'),
  body('total_floors')
    .notEmpty().withMessage('Số tầng không được để trống')
    .isInt({ min: 1, max: 99 }).withMessage('Số tầng phải từ 1 đến 99'),
  body('thumbnail_url')
    .optional()
    .isURL().withMessage('URL thumbnail không hợp lệ'),
  body('manager_id')
    .optional()
    .isUUID().withMessage('Mã quản lý không hợp lệ'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('Trạng thái hoạt động không hợp lệ'),
  body('images')
    .optional()
    .isArray({ max: 10 }).withMessage('Tối đa 10 ảnh'),
  body('images.*')
    .optional()
    .isURL().withMessage('URL ảnh không hợp lệ'),
  body('facilities')
    .optional()
    .isArray({ max: 20 }).withMessage('Tối đa 20 tiện ích'),
  body('facilities.*')
    .optional()
    .isUUID().withMessage('Mã tiện ích không hợp lệ'),
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
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự'),
  body('total_floors')
    .optional()
    .isInt({ min: 1, max: 99 }).withMessage('Số tầng phải từ 1 đến 99'),
  body('thumbnail_url')
    .optional()
    .isURL().withMessage('URL thumbnail không hợp lệ'),
  body('manager_id')
    .optional()
    .isUUID().withMessage('Mã quản lý không hợp lệ'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('Trạng thái hoạt động không hợp lệ'),
  body('images')
    .optional()
    .isArray({ max: 10 }).withMessage('Tối đa 10 ảnh'),
  body('images.*')
    .optional()
    .isURL().withMessage('URL ảnh không hợp lệ'),
  body('facilities')
    .optional()
    .isArray({ max: 20 }).withMessage('Tối đa 20 tiện ích'),
  body('facilities.*')
    .optional()
    .isUUID().withMessage('Mã tiện ích không hợp lệ'),
];

exports.toggleStatus = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('is_active')
    .isBoolean().withMessage('Trạng thái hoạt động không hợp lệ'),
];

exports.paramId = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
];
