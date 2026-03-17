const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

module.exports = async function authJwt(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: 'Account is inactive',
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
      message: 'Invalid or expired token',
    });
  }
};