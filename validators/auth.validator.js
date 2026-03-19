const { body } = require('express-validator');

const passwordRules = body('password')
  .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự');

const newPasswordRules = body('new_password')
  .isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự');

const emailRules = body('email')
  .isEmail().withMessage('Email không hợp lệ')
  .normalizeEmail({ gmail_remove_dots: false });

const otpRules = body('otp')
  .isLength({ min: 6, max: 6 }).withMessage('OTP phải gồm 6 ký tự');

exports.signup = [
  emailRules,
  passwordRules,
];

exports.verifySignup = [
  emailRules,
  otpRules,
];

exports.signin = [
  emailRules,
  body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
];

exports.forgotPassword = [
  emailRules,
];

exports.resetPassword = [
  emailRules,
  otpRules,
  newPasswordRules,
];

// Google login uses id_token issued by Google
exports.googleLogin = [
  body('id_token').notEmpty().withMessage('id_token không được để trống'),
];

exports.googleVerify = [
  body('id_token').notEmpty().withMessage('id_token không được để trống'),
  otpRules,
];
