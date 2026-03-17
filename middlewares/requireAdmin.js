const { ROLES } = require('../constants/roles');

module.exports = function requireAdmin(req, res, next) {
  console.log('req.user =', req.user);
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      message: 'Admin permission required',
    });
  }
  next();
};