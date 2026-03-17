const { body } = require('express-validator');

exports.updateProfile = [
  body('first_name')
    .optional()
    .isString().withMessage('Tên phải là chuỗi')
    .isLength({ min: 1, max: 100 }).withMessage('Tên phải từ 1–100 ký tự'),
  body('last_name')
    .optional()
    .isString().withMessage('Họ phải là chuỗi')
    .isLength({ min: 1, max: 100 }).withMessage('Họ phải từ 1–100 ký tự'),
  body('phone')
    .optional()
    .isString()
    .matches(/^[0-9]{8,15}$/).withMessage('Số điện thoại phải gồm 8–15 chữ số'),
  body('avatar_url')
    .optional()
    .isURL().withMessage('URL avatar không hợp lệ'),
  body('date_of_birth')
    .optional()
    .isDate().withMessage('Ngày sinh không hợp lệ (YYYY-MM-DD)')
    .custom((value) => {
      if (new Date(value) >= new Date()) {
        throw new Error('Ngày sinh phải là ngày trong quá khứ');
      }
      return true;
    }),
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Giới tính phải là MALE, FEMALE hoặc OTHER'),
  body('permanent_address')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Địa chỉ thường trú tối đa 500 ký tự'),
  body('emergency_contact_name')
    .optional()
    .isString()
    .isLength({ max: 255 }).withMessage('Tên liên hệ khẩn cấp tối đa 255 ký tự'),
  body('emergency_contact_phone')
    .optional()
    .isString()
    .matches(/^[0-9]{8,15}$/).withMessage('SĐT liên hệ khẩn cấp phải gồm 8–15 chữ số'),
];
