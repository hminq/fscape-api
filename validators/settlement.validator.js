const { param } = require('express-validator');

exports.paramId = [
  param('id').isUUID().withMessage('ID phải là UUID hợp lệ'),
];

exports.paramContractId = [
  param('contractId').isUUID().withMessage('contractId phải là UUID hợp lệ'),
];
