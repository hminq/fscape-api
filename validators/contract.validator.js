const { body, param } = require('express-validator');

exports.update = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('base_rent')
    .optional()
    .isFloat({ gt: 0, max: 500000000 }).withMessage('Tiền thuê phải từ >0 đến 500,000,000'),
  body('deposit_amount')
    .optional()
    .isFloat({ min: 0, max: 500000000 }).withMessage('Tiền cọc phải từ 0–500,000,000'),
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
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('signature_url')
    .notEmpty().withMessage('URL chữ ký không được để trống')
    .isURL().withMessage('URL chữ ký không hợp lệ'),
];

exports.managerSign = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('signature_url')
    .notEmpty().withMessage('URL chữ ký không được để trống')
    .isURL().withMessage('URL chữ ký không hợp lệ'),
];

exports.renew = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('durationMonths')
    .optional()
    .isInt().withMessage('Thời hạn phải là số nguyên')
    .isIn([6, 12]).withMessage('Thời hạn chỉ hỗ trợ 6 hoặc 12 tháng'),
  body('billingCycle')
    .optional()
    .isIn(['CYCLE_1M', 'CYCLE_3M', 'CYCLE_6M', 'ALL_IN']).withMessage('Chu kỳ thanh toán phải là CYCLE_1M, CYCLE_3M, CYCLE_6M hoặc ALL_IN'),
];

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];
