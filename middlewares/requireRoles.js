const { ROLES } = require("../constants/roles");

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }
    next();
  };
}

module.exports = requireRoles;