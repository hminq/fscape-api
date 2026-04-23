const { body } = require('express-validator');

const passwordRules = body('password')
  .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự');

const newPasswordRules = body('new_password')
  .isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự');

const emailRules = body('email')
  .isEmail().withMessage('Email không hợp lệ')
  .normalizeEmail({ gmail_remove_dots: false });

const firstNameRules = body('first_name')
  .isString().withMessage('Họ phải là chuỗi')
  .trim()
  .isLength({ min: 1, max: 100 }).withMessage('Họ phải từ 1-100 ký tự');

const lastNameRules = body('last_name')
  .isString().withMessage('Tên phải là chuỗi')
  .trim()
  .isLength({ min: 1, max: 100 }).withMessage('Tên phải từ 1-100 ký tự');

const otpRules = body('otp')
  .trim()
  .matches(/^[0-9]{6}$/).withMessage('OTP phải gồm đúng 6 chữ số');

exports.signup = [
  emailRules,
  passwordRules,
];

exports.verifySignup = [
  emailRules,
  firstNameRules,
  lastNameRules,
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
  body('id_token').notEmpty().withMessage('Thông tin đăng nhập Google không được để trống'),
];

exports.googleVerify = [
  body('id_token').notEmpty().withMessage('Thông tin đăng nhập Google không được để trống'),
  otpRules,
];
