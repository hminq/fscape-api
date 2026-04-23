const { param } = require('express-validator');

exports.paramId = [
  param('id').isUUID().withMessage('Mã định danh không hợp lệ'),
];

exports.paramContractId = [
  param('contract_id').isUUID().withMessage('Mã hợp đồng không hợp lệ'),
];
