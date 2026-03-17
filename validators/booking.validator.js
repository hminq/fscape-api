const { body, param } = require('express-validator');

exports.create = [
  body('roomId')
    .notEmpty().withMessage('roomId không được để trống')
    .isUUID().withMessage('roomId phải là UUID hợp lệ'),
  body('checkInDate')
    .notEmpty().withMessage('Ngày check-in không được để trống')
    .isDate().withMessage('Ngày check-in không hợp lệ (YYYY-MM-DD)'),
  body('durationMonths')
    .notEmpty().withMessage('Thời hạn không được để trống')
    .isInt().withMessage('Thời hạn phải là số nguyên')
    .isIn([6, 12]).withMessage('Thời hạn hợp đồng chỉ hỗ trợ 6 hoặc 12 tháng'),
  body('billingCycle')
    .notEmpty().withMessage('Chu kỳ thanh toán không được để trống')
    .isIn(['CYCLE_1M', 'CYCLE_3M', 'CYCLE_6M', 'ALL_IN']).withMessage('Chu kỳ thanh toán phải là CYCLE_1M, CYCLE_3M, CYCLE_6M hoặc ALL_IN'),
  body('customerInfo')
    .optional()
    .isObject().withMessage('customerInfo phải là object'),
  body('customerInfo.gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Giới tính phải là MALE, FEMALE hoặc OTHER'),
  body('customerInfo.dateOfBirth')
    .optional()
    .isDate().withMessage('Ngày sinh không hợp lệ (YYYY-MM-DD)'),
  body('customerInfo.permanentAddress')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Địa chỉ thường trú tối đa 500 ký tự'),
  body('customerInfo.emergencyContactName')
    .optional()
    .isString()
    .isLength({ max: 255 }).withMessage('Tên liên hệ khẩn cấp tối đa 255 ký tự'),
  body('customerInfo.emergencyContactPhone')
    .optional()
    .isString()
    .matches(/^[0-9]{8,15}$/).withMessage('SĐT liên hệ khẩn cấp phải gồm 8–15 chữ số'),
];

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];
