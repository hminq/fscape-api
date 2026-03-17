const { body, param } = require('express-validator');

exports.create = [
  body('name')
    .notEmpty().withMessage('Tên không được để trống')
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tên phải từ 1–255 ký tự'),
  body('building_id')
    .notEmpty().withMessage('building_id không được để trống')
    .isUUID().withMessage('building_id phải là UUID hợp lệ'),
  body('asset_type_id')
    .optional()
    .isUUID().withMessage('asset_type_id phải là UUID hợp lệ'),
  body('price')
    .optional()
    .isFloat({ min: 0, max: 500000000 }).withMessage('Giá phải từ 0–500,000,000'),
  body('current_room_id')
    .optional()
    .isUUID().withMessage('current_room_id phải là UUID hợp lệ'),
];

exports.createBatch = [
  body('name')
    .notEmpty().withMessage('Tên không được để trống')
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tên phải từ 1–255 ký tự'),
  body('building_id')
    .notEmpty().withMessage('building_id không được để trống')
    .isUUID().withMessage('building_id phải là UUID hợp lệ'),
  body('asset_type_id')
    .optional()
    .isUUID().withMessage('asset_type_id phải là UUID hợp lệ'),
  body('quantity')
    .notEmpty().withMessage('Số lượng không được để trống')
    .isInt({ min: 1, max: 10000 }).withMessage('Số lượng phải từ 1–10,000'),
  body('price')
    .optional()
    .isFloat({ min: 0, max: 500000000 }).withMessage('Giá phải từ 0–500,000,000'),
];

exports.update = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tên phải từ 1–255 ký tự'),
  body('asset_type_id')
    .optional()
    .isUUID().withMessage('asset_type_id phải là UUID hợp lệ'),
  body('price')
    .optional()
    .isFloat({ min: 0, max: 500000000 }).withMessage('Giá phải từ 0–500,000,000'),
];

exports.assign = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('room_id')
    .optional({ values: 'null' })
    .isUUID().withMessage('room_id phải là UUID hợp lệ'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Ghi chú tối đa 500 ký tự'),
];

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];
