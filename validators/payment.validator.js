const { body } = require('express-validator');

exports.createBookingPayment = [
  body('bookingId')
    .notEmpty().withMessage('bookingId không được để trống')
    .isUUID().withMessage('bookingId phải là UUID hợp lệ'),
];

exports.createInvoicePayment = [
  body('invoiceId')
    .notEmpty().withMessage('invoiceId không được để trống')
    .isUUID().withMessage('invoiceId phải là UUID hợp lệ'),
];
