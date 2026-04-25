const User = require("../models/user.model");
const { AuthProvider } = require("../models/authProvider.model");
const { sequelize } = require("../config/db");
const { generateOtp, findValidOtp, consumeOtp, OTP_TYPES } = require("../utils/otp.util");
const { hashPassword, comparePassword } = require("../utils/password.util");
const { sendOtpMail } = require("../utils/mail.util");
const { generateAccessToken } = require("../utils/token.util");
const { verifyGoogleIdToken } = require("../utils/google.util");

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
const normalizeName = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
};

const rethrowAuthPersistenceError = (error, fallbackMessage) => {
  if (error?.name === "SequelizeUniqueConstraintError") {
    throw new Error("Email đã được đăng ký");
  }

  if (error?.name === "SequelizeValidationError") {
    throw new Error(fallbackMessage);
  }

  throw error;
};

const toSafeAuthError = (error, fallbackMessage) => {
  if (!error) {
    return new Error(fallbackMessage);
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    return new Error("Email đã được đăng ký");
  }

  if (error.name === "SequelizeValidationError" || error.name === "TypeError") {
    return new Error(fallbackMessage);
  }

  if (error.message === "Thông tin đăng nhập không hợp lệ" || error.message === "Tài khoản đã bị vô hiệu hóa") {
    return error;
  }

  return new Error(fallbackMessage);
};

class AuthService {
  // Step 1: signup and send verification OTP.
  static async signup(email, password) {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (user) {
      const emailAuth = await AuthProvider.findOne({
        where: { user_id: user.id, provider: "EMAIL" },
      });
      if (emailAuth) {
        throw new Error("Email đã được đăng ký");
      }
    }

    const otp = await generateOtp(normalizedEmail, "EMAIL_VERIFICATION");
    await sendOtpMail(normalizedEmail, otp.code);

    return { message: "Đã gửi mã OTP đến email" };
  }

  // Step 2: verify OTP and create user.
  static async verifySignup(email, password, otp, firstName, lastName) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedFirstName = normalizeName(firstName);
    const normalizedLastName = normalizeName(lastName);
    const passwordHash = await hashPassword(password);

    try {
      return await sequelize.transaction(async (transaction) => {
        const otpRecord = await findValidOtp(normalizedEmail, otp, "EMAIL_VERIFICATION", transaction);

        let user = await User.findOne({ where: { email: normalizedEmail }, transaction });
        if (!user) {
          user = await User.create({
            email: normalizedEmail,
            role: "CUSTOMER",
            first_name: normalizedFirstName,
            last_name: normalizedLastName,
          }, { transaction });
        } else {
          if (!user.first_name && normalizedFirstName) user.first_name = normalizedFirstName;
          if (!user.last_name && normalizedLastName) user.last_name = normalizedLastName;
          if (!user.first_name || !user.last_name) {
            await user.save({ transaction });
          }
        }

        const emailAuth = await AuthProvider.findOne({
          where: { user_id: user.id, provider: "EMAIL" },
          transaction,
        });

        if (!emailAuth) {
          await AuthProvider.create({
            user_id: user.id,
            provider: "EMAIL",
            provider_id: normalizedEmail,
            password_hash: passwordHash,
            is_verified: true,
          }, { transaction });
        }

        await consumeOtp(otpRecord, transaction);
        return user;
      });
    } catch (error) {
      rethrowAuthPersistenceError(error, "Không thể hoàn tất đăng ký. Vui lòng thử lại.");
    }
  }

  static async signin(email, password) {
    const normalizedEmail = normalizeEmail(email);
    try {
      const auth = await AuthProvider.findOne({
        where: { provider: "EMAIL", provider_id: normalizedEmail },
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
        const existingUser = await User.findOne({ where: { email: normalizedEmail } });
        if (existingUser) {
          throw new Error("Tài khoản của bạn được đăng ký bằng Google. Vui lòng đăng nhập bằng Google hoặc Đăng ký để tạo mật khẩu.");
        }
        throw new Error("Thông tin đăng nhập không hợp lệ");
      }

      if (!auth.User) {
        throw new Error("Thông tin đăng nhập không hợp lệ");
      }

      if (auth.User.is_active === false) {
        throw new Error("Tài khoản đã bị vô hiệu hóa");
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
    } catch (error) {
      throw toSafeAuthError(error, "Đăng nhập không thành công");
    }
  }

  static async appLogin(email, password) {
    const normalizedEmail = normalizeEmail(email);
    try {
      const auth = await AuthProvider.findOne({
        where: { provider: "EMAIL", provider_id: normalizedEmail },
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "email", "role", "first_name", "last_name", "avatar_url", "is_active"],
          },
        ],
      });

      if (!auth || !auth.is_verified) {
        const existingUser = await User.findOne({ where: { email: normalizedEmail } });
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
    } catch (error) {
      throw toSafeAuthError(error, "Đăng nhập không thành công");
    }
  }

  static async forgotPassword(email) {
    const normalizedEmail = normalizeEmail(email);
    const otp = await generateOtp(normalizedEmail, "PASSWORD_RESET");
    await sendOtpMail(normalizedEmail, otp.code);
    return { message: "Đã gửi mã OTP" };
  }

  static async resetPassword(email, otp, newPassword) {
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await hashPassword(newPassword);

    try {
      return await sequelize.transaction(async (transaction) => {
        const otpRecord = await findValidOtp(normalizedEmail, otp, "PASSWORD_RESET", transaction);

        const auth = await AuthProvider.findOne({
          where: { provider: "EMAIL", provider_id: normalizedEmail },
          transaction,
        });

        if (!auth) throw new Error("Không tìm thấy tài khoản");

        auth.password_hash = passwordHash;
        await auth.save({ transaction });
        await consumeOtp(otpRecord, transaction);

        return { message: "Đã cập nhật mật khẩu" };
      });
    } catch (error) {
      rethrowAuthPersistenceError(error, "Không thể cập nhật mật khẩu. Vui lòng thử lại.");
    }
  }

  static async googleSignInStep1(idToken) {
    const payload = await verifyGoogleIdToken(idToken);
    const email = normalizeEmail(payload.email);
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
    const email = normalizeEmail(payload.email);
    const googleId = payload.sub;
    const givenName = payload.given_name;
    const familyName = payload.family_name;
    const picture = payload.picture;

    try {
      return await sequelize.transaction(async (transaction) => {
        const otpRecord = await findValidOtp(email, otpCode, OTP_TYPES.EMAIL_VERIFICATION, transaction);

        let user = await User.findOne({ where: { email }, transaction });

        if (!user) {
          user = await User.create({
            email,
            role: "CUSTOMER",
            first_name: normalizeName(givenName),
            last_name: normalizeName(familyName),
            avatar_url: picture,
          }, { transaction });
          await AuthProvider.create({
            user_id: user.id,
            provider: "GOOGLE",
            provider_id: googleId,
            is_verified: true,
          }, { transaction });
        } else {
          const existingGoogleAuth = await AuthProvider.findOne({
            where: { provider: "GOOGLE", provider_id: googleId },
            transaction,
          });

          if (!existingGoogleAuth) {
            await AuthProvider.create({
              user_id: user.id,
              provider: "GOOGLE",
              provider_id: googleId,
              is_verified: true,
            }, { transaction });
          }

          if (!user.first_name && givenName) user.first_name = normalizeName(givenName);
          if (!user.last_name && familyName) user.last_name = normalizeName(familyName);
          if (!user.avatar_url && picture) user.avatar_url = picture;
          await user.save({ transaction });
        }

        await consumeOtp(otpRecord, transaction);

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
      });
    } catch (error) {
      rethrowAuthPersistenceError(error, "Không thể hoàn tất xác minh. Vui lòng thử lại.");
    }
  }
}

module.exports = AuthService;
