const User = require("../models/user.model");
const { AuthProvider } = require("../models/authProvider.model");
const { generateOtp, verifyOtp, OTP_TYPES } = require("../utils/otp.util");
const { hashPassword, comparePassword } = require("../utils/password.util");
const { sendOtpMail } = require("../utils/mail.util");
const { generateAccessToken } = require("../utils/token.util");
const { verifyGoogleIdToken } = require("../utils/google.util");
class AuthService {
  // STEP 1: signup -> send OTP
  static async signup(email, password) {
    const existed = await User.findOne({ where: { email } });
    if (existed) throw new Error("Email already exists");

    const otp = await generateOtp(email, "EMAIL_VERIFICATION");
    await sendOtpMail(email, otp.code);

    return { message: "OTP sent to email" };
  }

  // STEP 2: verify OTP + create user
  static async verifySignup(email, password, otp) {
    await verifyOtp(email, otp, "EMAIL_VERIFICATION");

    const user = await User.create({
      email,
      role: "CUSTOMER",
    });

    await AuthProvider.create({
      user_id: user.id,
      provider: "EMAIL",
      provider_id: email,
      password_hash: await hashPassword(password),
      is_verified: true,
    });

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

    if (!auth || !auth.is_verified) throw new Error("Invalid credentials");
    if (!auth.User || auth.User.is_active === false) {
      if (auth.User.is_active === false) {
        console.log("Account is inactive", auth.User.id, auth.User.email, auth.User.is_active);
        throw new Error("User account is deactivated");
      }
    }
    const match = await comparePassword(password, auth.password_hash);
    if (!match) throw new Error("Invalid credentials");

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

    if (!auth || !auth.is_verified) throw new Error("Invalid credentials");
    if (!auth.User) throw new Error("Invalid credentials");
    const CLIENT_ROLES = ['CUSTOMER', 'RESIDENT'];
    if (!CLIENT_ROLES.includes(auth.User.role)) throw new Error("Tài khoản nội bộ không được phép đăng nhập tại đây");
    if (auth.User.is_active === false) throw new Error("User account is deactivated");

    const match = await comparePassword(password, auth.password_hash);
    if (!match) throw new Error("Invalid credentials");

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
    return { message: "OTP sent" };
  }

  static async resetPassword(email, otp, newPassword) {
    await verifyOtp(email, otp, "PASSWORD_RESET");

    const auth = await AuthProvider.findOne({
      where: { provider: "EMAIL", provider_id: email },
    });

    if (!auth) throw new Error("Account not found");

    auth.password_hash = await hashPassword(newPassword);
    await auth.save();

    return { message: "Password updated" };
  }

  static async googleSignInStep1(idToken) {
    const payload = await verifyGoogleIdToken(idToken);
    const email = payload.email;
    if (!payload.email_verified) throw new Error("Google email not verified");
    const otp = await generateOtp(email, OTP_TYPES.EMAIL_VERIFICATION);
    await sendOtpMail(email, otp.code);
    return { message: "OTP sent to email" };
  }

  static async googleSignInStep2(idToken, otpCode) {
    const payload = await verifyGoogleIdToken(idToken);
    const email = payload.email;
    const googleId = payload.sub;

    await verifyOtp(email, otpCode, OTP_TYPES.EMAIL_VERIFICATION);

    let user = await User.findOne({ where: { email } });

    if (user) {
      const existingGoogleAuth = await AuthProvider.findOne({
        where: { provider: "GOOGLE", provider_id: googleId },
      });

      if (existingGoogleAuth) {
        if (existingGoogleAuth.user_id !== user.id) {
          throw new Error("Google account already linked to another user");
        }
      } else {
        await AuthProvider.create({
          user_id: user.id,
          provider: "GOOGLE",
          provider_id: googleId,
          is_verified: true,
        });
      }
    } else {
      user = await User.create({
        email,
        role: "CUSTOMER",
      });
      await AuthProvider.create({
        user_id: user.id,
        provider: "GOOGLE",
        provider_id: googleId,
        is_verified: true,
      });
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
