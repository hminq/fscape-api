const { body, param } = require('express-validator');

exports.create = [
  body('room_id')
    .notEmpty().withMessage('room_id không được để trống')
    .isUUID().withMessage('room_id phải là UUID hợp lệ'),
  body('request_type')
    .notEmpty().withMessage('Loại yêu cầu không được để trống')
    .isIn(['REPAIR', 'CLEANING', 'COMPLAINT', 'ASSET_CHANGE', 'CHECKOUT', 'OTHER'])
    .withMessage('Loại yêu cầu phải là REPAIR, CLEANING, COMPLAINT, ASSET_CHANGE, CHECKOUT hoặc OTHER'),
  body('title')
    .notEmpty().withMessage('Tiêu đề không được để trống')
    .isString()
    .isLength({ min: 1, max: 255 }).withMessage('Tiêu đề phải từ 1–255 ký tự'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự'),
  body('image_urls')
    .optional()
    .isArray({ max: 3 }).withMessage('Tối đa 3 ảnh đính kèm'),
  body('image_urls.*')
    .isURL().withMessage('URL ảnh không hợp lệ'),
  body('related_asset_id')
    .optional()
    .isUUID().withMessage('related_asset_id phải là UUID hợp lệ'),
];

exports.assign = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('assigned_staff_id')
    .notEmpty().withMessage('assigned_staff_id không được để trống')
    .isUUID().withMessage('assigned_staff_id phải là UUID hợp lệ'),
];

exports.updateStatus = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
  body('status')
    .notEmpty().withMessage('Trạng thái không được để trống')
    .isIn(['PENDING', 'ASSIGNED', 'PRICE_PROPOSED', 'APPROVED', 'IN_PROGRESS', 'DONE', 'COMPLETED', 'REVIEWED', 'REFUNDED', 'CANCELLED'])
    .withMessage('Trạng thái không hợp lệ'),
  body('service_price')
    .optional()
    .isFloat({ min: 0, max: 500000000 }).withMessage('Giá dịch vụ phải từ 0–500,000,000'),
  body('completion_note')
    .optional()
    .isString()
    .isLength({ max: 2000 }).withMessage('Ghi chú hoàn thành tối đa 2000 ký tự'),
  body('feedback_rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Đánh giá phải từ 1–5'),
  body('feedback_comment')
    .optional()
    .isString()
    .isLength({ max: 1000 }).withMessage('Nhận xét tối đa 1000 ký tự'),
  body('report_reason')
    .optional()
    .isString()
    .isLength({ max: 2000 }).withMessage('Lý do báo cáo tối đa 2000 ký tự'),
];

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];
