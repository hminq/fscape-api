const userService = require('../services/userProfile.service');

exports.getProfile = async (req, res) => {
  try {
    const user = await userService.getProfileById(req.user.id);
    res.json({ data: user });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfileById(req.user.id, req.body);
    res.json({ data: user });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message });
  }
};
