const { body } = require('express-validator');

exports.createBookingPayment = [
  body('booking_id')
    .notEmpty().withMessage('Vui lòng chọn đơn đặt phòng')
    .isUUID().withMessage('Mã đặt phòng không hợp lệ'),
];

exports.createInvoicePayment = [
  body('invoice_id')
    .notEmpty().withMessage('Vui lòng chọn hóa đơn')
    .isUUID().withMessage('Mã hóa đơn không hợp lệ'),
];
