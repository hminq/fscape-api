const { param } = require('express-validator');

exports.paramId = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
];
