const { body, param } = require('express-validator');

exports.create = [
  body('room_number')
    .notEmpty().withMessage('Số phòng không được để trống')
    .isString()
    .isLength({ min: 1, max: 20 }).withMessage('Số phòng phải từ 1–20 ký tự'),
  body('building_id')
    .notEmpty().withMessage('building_id không được để trống')
    .isUUID().withMessage('building_id phải là UUID hợp lệ'),
  body('room_type_id')
    .notEmpty().withMessage('room_type_id không được để trống')
    .isUUID().withMessage('room_type_id phải là UUID hợp lệ'),
  body('floor')
    .notEmpty().withMessage('Tầng không được để trống')
    .isInt({ min: 1, max: 100 }).withMessage('Tầng phải từ 1–100'),
  body('thumbnail_url')
    .optional()
    .isURL().withMessage('URL thumbnail không hợp lệ'),
  body('image_3d_url')
    .optional()
    .isURL().withMessage('URL 3D không hợp lệ'),
  body('blueprint_url')
    .optional()
    .isURL().withMessage('URL blueprint không hợp lệ'),
];

exports.createBatch = [
  body('building_id')
    .notEmpty().withMessage('building_id không được để trống')
    .isUUID().withMessage('building_id phải là UUID hợp lệ'),
  body('room_type_id')
    .notEmpty().withMessage('room_type_id không được để trống')
    .isUUID().withMessage('room_type_id phải là UUID hợp lệ'),
  body('floor')
    .notEmpty().withMessage('Tầng không được để trống')
    .isInt({ min: 1, max: 100 }).withMessage('Tầng phải từ 1–100'),
  body('count')
    .notEmpty().withMessage('Số lượng không được để trống')
    .isInt({ min: 1, max: 50 }).withMessage('Số lượng phải từ 1–50'),
  body('thumbnail_url')
    .optional()
    .isURL().withMessage('URL thumbnail không hợp lệ'),
  body('image_3d_url')
    .optional()
    .isURL().withMessage('URL 3D không hợp lệ'),
  body('blueprint_url')
    .optional()
    .isURL().withMessage('URL blueprint không hợp lệ'),
  body('gallery_images')
    .optional()
    .isArray({ max: 5 }).withMessage('Tối đa 5 ảnh gallery'),
  body('gallery_images.*')
    .optional()
    .isURL().withMessage('URL ảnh gallery không hợp lệ'),
];

exports.update = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('room_number')
    .optional()
    .isString()
    .isLength({ min: 1, max: 20 }).withMessage('Số phòng phải từ 1–20 ký tự'),
  body('room_type_id')
    .optional()
    .isUUID().withMessage('room_type_id phải là UUID hợp lệ'),
  body('floor')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Tầng phải từ 1–100'),
  body('thumbnail_url')
    .optional()
    .isURL().withMessage('URL thumbnail không hợp lệ'),
  body('image_3d_url')
    .optional()
    .isURL().withMessage('URL 3D không hợp lệ'),
  body('blueprint_url')
    .optional()
    .isURL().withMessage('URL blueprint không hợp lệ'),
];

exports.toggleStatus = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('status')
    .notEmpty().withMessage('Trạng thái không được để trống')
    .isIn(['AVAILABLE', 'MAINTENANCE', 'LOCKED']).withMessage('Trạng thái phải là AVAILABLE, MAINTENANCE hoặc LOCKED'),
];

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];
