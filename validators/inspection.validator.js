const { body } = require('express-validator');

const assetsRules = [
  body('assets')
    .isArray({ min: 1 }).withMessage('Danh sách tài sản không được rỗng'),
  body('assets.*.qr_code')
    .notEmpty().withMessage('qr_code không được để trống')
    .isString()
    .isLength({ max: 100 }).withMessage('qr_code tối đa 100 ký tự'),
  body('assets.*.condition')
    .notEmpty().withMessage('Tình trạng không được để trống')
    .isIn(['GOOD', 'BROKEN']).withMessage('Tình trạng phải là GOOD hoặc BROKEN'),
  body('assets.*.note')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Ghi chú tối đa 500 ký tự'),
];

exports.staffPreview = [
  body('room_id')
    .notEmpty().withMessage('room_id không được để trống')
    .isUUID().withMessage('room_id phải là UUID hợp lệ'),
  ...assetsRules,
];

exports.staffConfirm = [
  body('room_id')
    .notEmpty().withMessage('room_id không được để trống')
    .isUUID().withMessage('room_id phải là UUID hợp lệ'),
  ...assetsRules,
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 }).withMessage('Ghi chú tối đa 1000 ký tự'),
];

exports.residentPreview = [
  ...assetsRules,
];

exports.residentConfirm = [
  ...assetsRules,
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 }).withMessage('Ghi chú tối đa 1000 ký tự'),
];
