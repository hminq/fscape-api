const { body, param } = require('express-validator');

exports.update = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('base_rent')
    .optional()
    .isFloat({ gt: 0, max: 500000000 }).withMessage('Tiền thuê phải từ >0 đến 500,000,000'),
  body('deposit_amount')
    .optional()
    .isFloat({ min: 0, max: 500000000 }).withMessage('Tiền cọc phải từ 0-500,000,000'),
  body('start_date')
    .optional()
    .isDate().withMessage('Ngày bắt đầu không hợp lệ (YYYY-MM-DD)'),
  body('end_date')
    .optional()
    .isDate().withMessage('Ngày kết thúc không hợp lệ (YYYY-MM-DD)'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 }).withMessage('Ghi chú tối đa 1000 ký tự'),
];

exports.customerSign = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('signature_url')
    .notEmpty().withMessage('Chữ ký không được để trống')
    .isString()
    .notEmpty().withMessage('Chữ ký không hợp lệ'),
];

exports.managerSign = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('signature_url')
    .notEmpty().withMessage('Chữ ký không được để trống')
    .isString()
    .notEmpty().withMessage('Chữ ký không hợp lệ'),
];

exports.renew = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('duration_months')
    .optional()
    .isInt().withMessage('Thời hạn phải là số nguyên')
    .isIn([6, 12]).withMessage('Thời hạn chỉ hỗ trợ 6 hoặc 12 tháng'),
  body('billing_cycle')
    .optional()
    .isIn(['CYCLE_1M', 'CYCLE_3M', 'CYCLE_6M', 'ALL_IN']).withMessage('Chu kỳ thanh toán phải là CYCLE_1M, CYCLE_3M, CYCLE_6M hoặc ALL_IN'),
  body('start_date')
    .optional()
    .isDate().withMessage('Ngày bắt đầu không hợp lệ (YYYY-MM-DD)'),
];

exports.sendReminder = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('reminder_type')
    .notEmpty().withMessage('Loại nhắc nhở không được để trống')
    .isIn(['SIGN', 'PAY_FIRST_RENT', 'CHECK_IN', 'EXPIRING'])
    .withMessage('Loại nhắc nhở không hợp lệ'),
];

exports.terminate = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
  body('termination_reason')
    .notEmpty().withMessage('Lý do chấm dứt không được để trống')
    .isString().withMessage('Lý do chấm dứt phải là chuỗi')
    .isLength({ max: 1000 }).withMessage('Lý do chấm dứt tối đa 1000 ký tự'),
  body('assigned_staff_id')
    .optional()
    .isUUID().withMessage('Mã nhân viên không hợp lệ'),
];

exports.paramId = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
];
