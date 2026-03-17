const { INTERNAL_LOGIN_ROLES } = require('../constants/auth');

module.exports = function authorizeInternal(req, res, next) {
  if (!INTERNAL_LOGIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      message: 'Forbidden',
    });
  }
  next();
};