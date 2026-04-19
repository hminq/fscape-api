const { body, param } = require('express-validator');

exports.create = [
  body('room_number')
    .notEmpty().withMessage('Số phòng không được để trống')
    .isString()
    .isLength({ min: 1, max: 20 }).withMessage('Số phòng phải từ 1-20 ký tự'),
  body('building_id')
    .notEmpty().withMessage('Vui lòng chọn tòa nhà')
    .isUUID().withMessage('Mã tòa nhà không hợp lệ'),
  body('room_type_id')
    .notEmpty().withMessage('Vui lòng chọn loại phòng')
    .isUUID().withMessage('Mã loại phòng không hợp lệ'),
  body('floor')
    .notEmpty().withMessage('Tầng không được để trống')
    .isInt({ min: 1, max: 100 }).withMessage('Tầng phải từ 1-100'),
  body('thumbnail_url')
    .optional()
    .isString()
    .notEmpty().withMessage('Thumbnail không hợp lệ'),
  body('image_3d_url')
    .optional()
    .isString()
    .notEmpty().withMessage('File 3D không hợp lệ'),
  body('blueprint_url')
    .optional()
    .isString()
    .notEmpty().withMessage('Blueprint không hợp lệ'),
];

exports.createBatch = [
  body('building_id')
    .notEmpty().withMessage('Vui lòng chọn tòa nhà')
    .isUUID().withMessage('Mã tòa nhà không hợp lệ'),
  body('room_type_id')
    .notEmpty().withMessage('Vui lòng chọn loại phòng')
    .isUUID().withMessage('Mã loại phòng không hợp lệ'),
  body('floor')
    .notEmpty().withMessage('Tầng không được để trống')
    .isInt({ min: 1, max: 100 }).withMessage('Tầng phải từ 1-100'),
  body('count')
    .notEmpty().withMessage('Số lượng không được để trống')
    .isInt({ min: 1, max: 50 }).withMessage('Số lượng phải từ 1-50'),
  body('thumbnail_url')
    .optional()
    .isString()
    .notEmpty().withMessage('Thumbnail không hợp lệ'),
  body('image_3d_url')
    .optional()
    .isString()
    .notEmpty().withMessage('File 3D không hợp lệ'),
  body('blueprint_url')
    .optional()
    .isString()
    .notEmpty().withMessage('Blueprint không hợp lệ'),
  body('gallery_images')
    .optional()
    .isArray({ max: 5 }).withMessage('Tối đa 5 ảnh gallery'),
  body('gallery_images.*')
    .optional()
    .isString()
    .notEmpty().withMessage('Ảnh gallery không hợp lệ'),
];

exports.update = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('room_number')
    .optional()
    .isString()
    .isLength({ min: 1, max: 20 }).withMessage('Số phòng phải từ 1-20 ký tự'),
  body('room_type_id')
    .optional()
    .isUUID().withMessage('Mã loại phòng không hợp lệ'),
  body('floor')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Tầng phải từ 1-100'),
  body('thumbnail_url')
    .optional()
    .isString()
    .notEmpty().withMessage('Thumbnail không hợp lệ'),
  body('image_3d_url')
    .optional()
    .isString()
    .notEmpty().withMessage('File 3D không hợp lệ'),
  body('blueprint_url')
    .optional()
    .isString()
    .notEmpty().withMessage('Blueprint không hợp lệ'),
];

exports.toggleStatus = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('status')
    .notEmpty().withMessage('Trạng thái không được để trống')
    .isIn(['AVAILABLE', 'LOCKED']).withMessage('Trạng thái phải là AVAILABLE hoặc LOCKED'),
];

exports.paramId = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
];

exports.paramBuildingId = [
  param('building_id').isUUID().withMessage('Mã tòa nhà không hợp lệ'),
];
