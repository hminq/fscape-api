const { body } = require('express-validator');

exports.updateProfile = [
  body('first_name')
    .notEmpty().withMessage('Tên không được để trống')
    .isString().withMessage('Tên phải là chuỗi')
    .isLength({ min: 1, max: 100 }).withMessage('Tên phải từ 1–100 ký tự'),
  body('last_name')
    .notEmpty().withMessage('Họ không được để trống')
    .isString().withMessage('Họ phải là chuỗi')
    .isLength({ min: 1, max: 100 }).withMessage('Họ phải từ 1–100 ký tự'),
  body('phone')
    .notEmpty().withMessage('Số điện thoại không được để trống')
    .isString().withMessage('SĐT phải là chuỗi')
    .matches(/^[0-9+ ]{8,20}$/).withMessage('Số điện thoại không hợp lệ'),
  body('avatar_url')
    .optional({ checkFalsy: true })
    .isString().withMessage('URL avatar không hợp lệ'),
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
    .optional({ checkFalsy: true })
    .isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Giới tính không hợp lệ'),
  body('permanent_address')
    .optional({ checkFalsy: true })
    .isString().withMessage('Địa chỉ phải là chuỗi')
    .isLength({ max: 500 }).withMessage('Địa chỉ thường trú tối đa 500 ký tự'),
  body('emergency_contact_name')
    .optional({ checkFalsy: true })
    .isString().withMessage('Tên người liên hệ phải là chuỗi')
    .isLength({ max: 255 }).withMessage('Tên liên hệ khẩn cấp tối đa 255 ký tự'),
  body('emergency_contact_phone')
    .optional({ checkFalsy: true })
    .isString().withMessage('SĐT phải là chuỗi')
    .matches(/^[0-9+ ]{8,20}$/).withMessage('SĐT khẩn cấp không hợp lệ'),
];
