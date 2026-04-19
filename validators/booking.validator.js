const { body, param } = require('express-validator');

exports.create = [
  body('room_id')
    .notEmpty().withMessage('Vui lòng chọn phòng')
    .isUUID().withMessage('Mã phòng không hợp lệ'),
  body('check_in_date')
    .notEmpty().withMessage('Ngày check-in không được để trống')
    .isDate().withMessage('Ngày check-in không hợp lệ (YYYY-MM-DD)'),
  body('duration_months')
    .notEmpty().withMessage('Thời hạn không được để trống')
    .isInt().withMessage('Thời hạn phải là số nguyên')
    .isIn([6, 12]).withMessage('Thời hạn hợp đồng chỉ hỗ trợ 6 hoặc 12 tháng'),
  body('billing_cycle')
    .notEmpty().withMessage('Chu kỳ thanh toán không được để trống')
    .isIn(['CYCLE_1M', 'CYCLE_3M', 'CYCLE_6M', 'ALL_IN']).withMessage('Chu kỳ thanh toán phải là CYCLE_1M, CYCLE_3M, CYCLE_6M hoặc ALL_IN'),
  body('customer_info')
    .optional()
    .isObject().withMessage('Thông tin khách hàng không hợp lệ'),
  body('customer_info.gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Giới tính phải là MALE, FEMALE hoặc OTHER'),
  body('customer_info.date_of_birth')
    .optional()
    .isDate().withMessage('Ngày sinh không hợp lệ (YYYY-MM-DD)'),
  body('customer_info.permanent_address')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Địa chỉ thường trú tối đa 500 ký tự'),
  body('customer_info.emergency_contact_name')
    .optional()
    .isString()
    .isLength({ max: 255 }).withMessage('Tên liên hệ khẩn cấp tối đa 255 ký tự'),
  body('customer_info.emergency_contact_phone')
    .optional()
    .isString()
    .matches(/^[0-9]{8,15}$/).withMessage('SĐT liên hệ khẩn cấp phải gồm 8-15 chữ số'),
];

exports.paramId = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
];
