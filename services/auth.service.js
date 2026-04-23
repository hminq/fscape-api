const User = require("../models/user.model");
const { AuthProvider } = require("../models/authProvider.model");
const { generateOtp, verifyOtp, OTP_TYPES } = require("../utils/otp.util");
const { hashPassword, comparePassword } = require("../utils/password.util");
const { sendOtpMail } = require("../utils/mail.util");
const { generateAccessToken } = require("../utils/token.util");
const { verifyGoogleIdToken } = require("../utils/google.util");
class AuthService {
  // Step 1: signup and send verification OTP.
  static async signup(email, password) {
    const user = await User.findOne({ where: { email } });
    if (user) {
      const emailAuth = await AuthProvider.findOne({
        where: { user_id: user.id, provider: "EMAIL" },
      });
      if (emailAuth) {
        throw new Error("Email đã được đăng ký");
      }
    }

    const otp = await generateOtp(email, "EMAIL_VERIFICATION");
    await sendOtpMail(email, otp.code);

    return { message: "Đã gửi mã OTP đến email" };
  }

  // Step 2: verify OTP and create user.
  static async verifySignup(email, password, otp, firstName, lastName) {
    await verifyOtp(email, otp, "EMAIL_VERIFICATION");

    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        email,
        role: "CUSTOMER",
        first_name: firstName?.trim() || null,
        last_name: lastName?.trim() || null,
      });
    } else {
      const normalizedFirstName = firstName?.trim();
      const normalizedLastName = lastName?.trim();
      if (!user.first_name && normalizedFirstName) user.first_name = normalizedFirstName;
      if (!user.last_name && normalizedLastName) user.last_name = normalizedLastName;
      if (!user.first_name || !user.last_name) {
        await user.save();
      }
    }

    const emailAuth = await AuthProvider.findOne({
      where: { user_id: user.id, provider: "EMAIL" },
    });

    if (!emailAuth) {
      await AuthProvider.create({
        user_id: user.id,
        provider: "EMAIL",
        provider_id: email,
        password_hash: await hashPassword(password),
        is_verified: true,
      });
    }

    return user;
  }

  static async signin(email, password) {
    const auth = await AuthProvider.findOne({
      where: { provider: "EMAIL", provider_id: email },
      include: [
        {
          model: User,
          as: "User",
          attributes: [
            "id",
            "email",
            "role",
            "first_name",
            "last_name",
            "avatar_url",
            "is_active",
          ],
        },
      ],
    });

    if (!auth || !auth.is_verified) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new Error("Tài khoản của bạn được đăng ký bằng Google. Vui lòng đăng nhập bằng Google hoặc Đăng ký để tạo mật khẩu.");
      }
      throw new Error("Thông tin đăng nhập không hợp lệ");
    }
    if (!auth.User || auth.User.is_active === false) {
      if (auth.User && auth.User.is_active === false) {
        console.log("Account is inactive", auth.User.id, auth.User.email, auth.User.is_active);
        throw new Error("Tài khoản đã bị vô hiệu hóa");
      }
    }
    const match = await comparePassword(password, auth.password_hash);
    if (!match) throw new Error("Thông tin đăng nhập không hợp lệ");

    return {
      access_token: generateAccessToken(auth.User),
      user: {
        id: auth.User.id,
        email: auth.User.email,
        role: auth.User.role,
        first_name: auth.User.first_name,
        last_name: auth.User.last_name,
        avatar_url: auth.User.avatar_url,
      },
    };
  }

  static async appLogin(email, password) {
    const auth = await AuthProvider.findOne({
      where: { provider: "EMAIL", provider_id: email },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "email", "role", "first_name", "last_name", "avatar_url", "is_active"],
        },
      ],
    });

    if (!auth || !auth.is_verified) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new Error("Tài khoản của bạn được đăng ký bằng Google. Vui lòng đăng nhập bằng Google hoặc Đăng ký để tạo mật khẩu.");
      }
      throw new Error("Thông tin đăng nhập không hợp lệ");
    }
    if (!auth.User) throw new Error("Thông tin đăng nhập không hợp lệ");
    if (auth.User.role !== 'RESIDENT') {
      const err = new Error("Chỉ cư dân được phép đăng nhập tại đây");
      err.status = 403;
      throw err;
    }
    if (auth.User.is_active === false) throw new Error("Tài khoản đã bị vô hiệu hóa");

    const match = await comparePassword(password, auth.password_hash);
    if (!match) throw new Error("Thông tin đăng nhập không hợp lệ");

    await auth.User.update({ last_login_at: new Date() });

    return {
      access_token: generateAccessToken(auth.User),
      user: {
        id: auth.User.id,
        email: auth.User.email,
        role: auth.User.role,
        first_name: auth.User.first_name,
        last_name: auth.User.last_name,
        avatar_url: auth.User.avatar_url,
      },
    };
  }

  static async forgotPassword(email) {
    const otp = await generateOtp(email, "PASSWORD_RESET");
    await sendOtpMail(email, otp.code);
    return { message: "Đã gửi mã OTP" };
  }

  static async resetPassword(email, otp, newPassword) {
    await verifyOtp(email, otp, "PASSWORD_RESET");

    const auth = await AuthProvider.findOne({
      where: { provider: "EMAIL", provider_id: email },
    });

    if (!auth) throw new Error("Không tìm thấy tài khoản");

    auth.password_hash = await hashPassword(newPassword);
    await auth.save();

    return { message: "Đã cập nhật mật khẩu" };
  }

  static async googleSignInStep1(idToken) {
    const payload = await verifyGoogleIdToken(idToken);
    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.name;

    if (!payload.email_verified) throw new Error("Email Google chưa được xác minh");

    let user = await User.findOne({ where: { email } });

    if (!user) {
      const otp = await generateOtp(email, OTP_TYPES.EMAIL_VERIFICATION);
      await sendOtpMail(email, otp.code);
      return { message: "Đã gửi mã OTP đến email", name };
    } else {
      const existingGoogleAuth = await AuthProvider.findOne({
        where: { provider: "GOOGLE", provider_id: googleId },
      });

      if (existingGoogleAuth) {
        if (existingGoogleAuth.user_id !== user.id) {
          throw new Error("Tài khoản Google đã được liên kết với người dùng khác");
        }
      } else {
        await AuthProvider.create({
          user_id: user.id,
          provider: "GOOGLE",
          provider_id: googleId,
          is_verified: true,
        });
      }
    }

    return {
      access_token: generateAccessToken(user),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        name,
      },
    };
  }

  static async googleSignInStep2(idToken, otpCode) {
    const payload = await verifyGoogleIdToken(idToken);
    const email = payload.email;
    const googleId = payload.sub;
    const givenName = payload.given_name;
    const familyName = payload.family_name;
    const picture = payload.picture;

    await verifyOtp(email, otpCode, OTP_TYPES.EMAIL_VERIFICATION);

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        email,
        role: "CUSTOMER",
        first_name: givenName,
        last_name: familyName,
        avatar_url: picture,
      });
      await AuthProvider.create({
        user_id: user.id,
        provider: "GOOGLE",
        provider_id: googleId,
        is_verified: true,
      });
    } else {
      const existingGoogleAuth = await AuthProvider.findOne({
        where: { provider: "GOOGLE", provider_id: googleId },
      });

      if (!existingGoogleAuth) {
        await AuthProvider.create({
          user_id: user.id,
          provider: "GOOGLE",
          provider_id: googleId,
          is_verified: true,
        });
      }

      // Backfill profile fields from Google when missing.
      if (!user.first_name && givenName) user.first_name = givenName;
      if (!user.last_name && familyName) user.last_name = familyName;
      if (!user.avatar_url && picture) user.avatar_url = picture;
      await user.save();
    }

    return {
      access_token: generateAccessToken(user),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
      },
    };
  }
}

module.exports = AuthService;
