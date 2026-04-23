const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    return res.status(422).json({
      message: errorList[0]?.msg || 'Dữ liệu không hợp lệ',
      errors: errorList,
    });
  }
  next();
};
