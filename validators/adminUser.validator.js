const { body, param } = require('express-validator');

exports.createUser = [
  body('email')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('role')
    .isIn(['ADMIN', 'BUILDING_MANAGER', 'STAFF']).withMessage('Role phải là ADMIN, BUILDING_MANAGER hoặc STAFF'),
  body('first_name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 }).withMessage('Tên phải từ 1–100 ký tự'),
  body('last_name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 }).withMessage('Họ phải từ 1–100 ký tự'),
  body('phone')
    .optional()
    .isString()
    .matches(/^[0-9]{8,15}$/).withMessage('Số điện thoại phải gồm 8–15 chữ số'),
  body('building_id')
    .optional()
    .isUUID().withMessage('building_id phải là UUID hợp lệ'),
];

exports.updateUserStatus = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('is_active')
    .isBoolean().withMessage('is_active phải là boolean'),
];

exports.assignBuilding = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('building_id')
    .isUUID().withMessage('building_id phải là UUID hợp lệ'),
];
