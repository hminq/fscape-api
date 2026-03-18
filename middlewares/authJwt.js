const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

module.exports = async function authJwt(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Thiếu hoặc sai định dạng header Authorization',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Không tìm thấy người dùng' });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: 'Tài khoản đã bị vô hiệu hóa',
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
      building_id: user.building_id,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: 'Token không hợp lệ hoặc đã hết hạn',
    });
  }
};