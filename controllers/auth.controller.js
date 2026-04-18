const AuthService = require('../services/auth.service');

const getStatus = (error, fallbackStatus) => error.status || fallbackStatus;
const getMessage = (error, fallbackMessage) => error.message || fallbackMessage;

exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.signup(email, password);
    res.json(result);
  } catch (e) {
    res.status(getStatus(e, 400)).json({ message: getMessage(e, 'Đăng ký không thành công') });
  }
};

exports.verifySignup = async (req, res) => {
  try {
    const { email, password, otp, first_name, last_name } = req.body;
    const user = await AuthService.verifySignup(email, password, otp, first_name, last_name);
    res.status(201).json(user);
  } catch (e) {
    res.status(getStatus(e, 400)).json({ message: getMessage(e, 'Xác minh đăng ký không thành công') });
  }
};

exports.signin = async (req, res) => {
  try {
    const token = await AuthService.signin(req.body.email, req.body.password);
    res.json(token);
  } catch (e) {
    res.status(getStatus(e, 401)).json({ message: getMessage(e, 'Đăng nhập không thành công') });
  }
};

exports.appLogin = async (req, res) => {
  try {
    const result = await AuthService.appLogin(req.body.email, req.body.password);
    res.json(result);
  } catch (e) {
    res.status(getStatus(e, 401)).json({ message: getMessage(e, 'Đăng nhập không thành công') });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const result = await AuthService.forgotPassword(req.body.email);
    res.json(result);
  } catch (e) {
    res.status(getStatus(e, 400)).json({ message: getMessage(e, 'Không thể gửi mã OTP') });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    const result = await AuthService.resetPassword(email, otp, new_password);
    res.json(result);
  } catch (e) {
    res.status(getStatus(e, 400)).json({ message: getMessage(e, 'Đặt lại mật khẩu không thành công') });
  }
};

// Google sign-in (two-step)
exports.googleLogin = async (req, res) => {
  try {
    const { id_token } = req.body;
    const result = await AuthService.googleSignInStep1(id_token);
    res.json(result);
  } catch (e) {
    res.status(getStatus(e, 400)).json({ message: getMessage(e, 'Đăng nhập Google không thành công') });
  }
};

exports.googleVerify = async (req, res) => {
  try {
    const { id_token, otp } = req.body;
    const result = await AuthService.googleSignInStep2(id_token, otp);
    res.json(result);
  } catch (e) {
    res.status(getStatus(e, 400)).json({ message: getMessage(e, 'Xác minh Google không thành công') });
  }
};
