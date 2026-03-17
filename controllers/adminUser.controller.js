const AdminUserService = require('../services/adminUser.service');

exports.createUser = async (req, res) => {
  try {
    const user = await AdminUserService.createInternalUser(req.body);
    return res.status(201).json(user);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await AdminUserService.getUsers(req.user, req.query);
    return res.json({ data: users });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const stats = await AdminUserService.getUserStats(req.user);
    return res.json({ data: stats });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getAvailableManagers = async (req, res) => {
  try {
    const managers = await AdminUserService.getAvailableManagers();
    return res.json({ data: managers });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        message: 'is_active must be boolean',
      });
    }

    const user = await AdminUserService.updateUserStatus(id, is_active);

    return res.json({
      message: 'User status updated',
      data: {
        id: user.id,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.assignBuilding = async (req, res) => {
  try {
    const { id } = req.params;
    const { building_id } = req.body;

    if (building_id !== null && typeof building_id !== 'string') {
      return res.status(400).json({ message: 'building_id must be a UUID string or null' });
    }

    const user = await AdminUserService.assignBuilding(id, building_id);

    return res.json({
      message: 'Building assignment updated',
      data: {
        id: user.id,
        building_id: user.building_id,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};
