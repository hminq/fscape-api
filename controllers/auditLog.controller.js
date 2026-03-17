const AuditLogService = require('../services/auditLog.service');

exports.list = async (req, res) => {
  try {
    const result = await AuditLogService.list(req.user, req.query);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.getEntityTypes = async (req, res) => {
  try {
    const types = await AuditLogService.getEntityTypes();
    return res.json({ data: types });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
