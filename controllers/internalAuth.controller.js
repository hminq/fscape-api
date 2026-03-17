const InternalAuthService = require('../services/internalAuth.service');

exports.login = async (req, res) => {
  try {
    const result = await InternalAuthService.login(req.body);
    res.json(result);
  } catch (err) {
    res.status(401).json({
      message: err.message,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({
        message: 'old_password and new_password are required',
      });
    }

    await InternalAuthService.changePassword(
      req.user.id,
      old_password,
      new_password
    );

    res.json({
      message: 'Password changed successfully',
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};