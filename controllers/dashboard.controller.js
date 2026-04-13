const DashboardService = require('../services/dashboard.service');

exports.getDashboard = async (req, res) => {
  try {
    const dashboard = await DashboardService.getDashboard(req.user);
    return res.json({ data: dashboard });
  } catch (err) {
    console.error('Error getting dashboard:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Lỗi server nội bộ' });
  }
};

exports.getBuildingManagerDashboard = async (req, res) => {
  try {
    const dashboard = await DashboardService.getBuildingManagerDashboard(req.user);
    return res.json({ data: dashboard });
  } catch (err) {
    console.error('Error getting building manager dashboard:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Lỗi server nội bộ' });
  }
};
