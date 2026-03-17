const { body } = require('express-validator');

exports.login = [
  body('email')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Mật khẩu không được để trống'),
];

exports.changePassword = [
  body('old_password')
    .notEmpty().withMessage('Mật khẩu cũ không được để trống'),
  body('new_password')
    .isLength({ min: 8 }).withMessage('Mật khẩu mới phải có ít nhất 8 ký tự')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt'),
];
