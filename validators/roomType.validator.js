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
  body('base_price')
    .notEmpty().withMessage('Giá cơ bản không được để trống')
    .isFloat({ gt: 0, max: 500000000 }).withMessage('Giá cơ bản phải từ >0 đến 500,000,000'),
  body('deposit_months')
    .optional()
    .isInt({ min: 1, max: 1 }).withMessage('deposit_months cố định là 1'),
  body('capacity_min')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Sức chứa tối thiểu phải từ 1–10'),
  body('capacity_max')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Sức chứa tối đa phải từ 1–10'),
  body('bedrooms')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Số phòng ngủ phải từ 1–10'),
  body('bathrooms')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('Số phòng tắm phải từ 0–10'),
  body('area_sqm')
    .optional()
    .isFloat({ min: 5, max: 10000 }).withMessage('Diện tích phải từ 5–10,000 m²'),
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
  body('base_price')
    .optional()
    .isFloat({ gt: 0, max: 500000000 }).withMessage('Giá cơ bản phải từ >0 đến 500,000,000'),
  body('deposit_months')
    .optional()
    .isInt({ min: 1, max: 1 }).withMessage('deposit_months cố định là 1'),
  body('capacity_min')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Sức chứa tối thiểu phải từ 1–10'),
  body('capacity_max')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Sức chứa tối đa phải từ 1–10'),
  body('bedrooms')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Số phòng ngủ phải từ 1–10'),
  body('bathrooms')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('Số phòng tắm phải từ 0–10'),
  body('area_sqm')
    .optional()
    .isFloat({ min: 5, max: 10000 }).withMessage('Diện tích phải từ 5–10,000 m²'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active phải là boolean'),
];

exports.replaceTemplateAssets = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('assets')
    .isArray({ min: 0, max: 50 }).withMessage('Danh sách tài sản phải từ 0–50 mục'),
  body('assets.*.asset_type_id')
    .isUUID().withMessage('asset_type_id phải là UUID hợp lệ'),
  body('assets.*.quantity')
    .isInt({ min: 1 }).withMessage('Số lượng phải >= 1'),
];

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];
