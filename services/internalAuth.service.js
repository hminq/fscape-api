const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { AuthProvider } = require("../models/authProvider.model");
const { INTERNAL_LOGIN_ROLES } = require("../constants/auth");

class InternalAuthService {
  // ========= LOGIN =========
  static async login({ email, password }) {
    if (!email || !password) {
      throw new Error("Vui lòng nhập email và mật khẩu");
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Không tìm thấy email này");
    }

    if (!INTERNAL_LOGIN_ROLES.includes(user.role)) {
      throw new Error("Tài khoản không được phép đăng nhập tại đây. Vui lòng sử dụng trang đăng nhập dành cho khách hàng");
    }

    if (!user.is_active) {
      throw new Error("Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên");
    }

    const auth = await AuthProvider.findOne({
      where: {
        user_id: user.id,
        provider: "EMAIL",
      },
    });

    if (!auth || !auth.password_hash) {
      throw new Error("Tài khoản chưa thiết lập mật khẩu. Vui lòng liên hệ quản trị viên");
    }

    const match = await bcrypt.compare(password, auth.password_hash);
    if (!match) {
      throw new Error("Mật khẩu không chính xác");
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        building_id: user.building_id,
      },
    };
  }

  // ========= CHANGE PASSWORD =========
  static async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("Không tìm thấy người dùng");
    }

    if (!INTERNAL_LOGIN_ROLES.includes(user.role)) {
      throw new Error("Tài khoản không được phép đổi mật khẩu tại đây");
    }

    const auth = await AuthProvider.findOne({
      where: {
        user_id: user.id,
        provider: "EMAIL",
      },
    });

    if (!auth || !auth.password_hash) {
      throw new Error("Phương thức xác thực không hợp lệ");
    }

    const match = await bcrypt.compare(oldPassword, auth.password_hash);
    if (!match) {
      throw new Error("Mật khẩu cũ không chính xác");
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await auth.update({
      password_hash: newHash,
    });

    return true;
  }
}

module.exports = InternalAuthService;
