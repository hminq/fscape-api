const { body, param } = require('express-validator');

exports.send = [
  body('title')
    .notEmpty().withMessage('Tiêu đề không được để trống')
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tiêu đề phải từ 1–255 ký tự'),
  body('content')
    .notEmpty().withMessage('Nội dung không được để trống')
    .isString()
    .isLength({ max: 2000 }).withMessage('Nội dung tối đa 2000 ký tự'),
  body('target')
    .notEmpty().withMessage('Đối tượng gửi không được để trống')
    .isIn(['building', 'room']).withMessage('Đối tượng gửi phải là building hoặc room'),
  body('room_id')
    .optional()
    .isUUID().withMessage('room_id phải là UUID hợp lệ'),
];

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];
