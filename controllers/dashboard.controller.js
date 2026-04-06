const DashboardService = require('../services/dashboard.service');

exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await DashboardService.getDashboardStats();
    return res.json({ data: stats });
  } catch (err) {
    console.error('Error getting dashboard stats:', err);
    return res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};