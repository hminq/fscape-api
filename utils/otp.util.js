const { OtpCode, OTP_TYPES } = require('../models/otpCode.model');
const { Op } = require('sequelize');

const OTP_EXPIRE_MINUTES = 20;
const OTP_LIMIT_PER_DAY = 5;
const OTP_REGEX = /^[0-9]{6}$/;

const normalizeOtpCode = (code) => String(code ?? '').trim();

exports.generateOtp = async (email, type) => {
  const today = new Date();
  today.setHours(0,0,0,0);

  const count = await OtpCode.count({
    where: {
      email,
      type,
      createdAt: { [Op.gte]: today }
    }
  });

  if (count >= OTP_LIMIT_PER_DAY) {
    throw new Error('Đã vượt quá giới hạn yêu cầu OTP (5 lần/ngày)');
  }

  await OtpCode.update(
    { is_used: true },
    {
      where: {
        email,
        type,
        is_used: false,
        expires_at: { [Op.gt]: new Date() }
      }
    }
  );

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  return OtpCode.create({
    email,
    code,
    type,
    expires_at: new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000)
  });
};

exports.findValidOtp = async (email, code, type, transaction) => {
  const normalizedCode = normalizeOtpCode(code);

  if (!OTP_REGEX.test(normalizedCode)) {
    throw new Error('OTP phải gồm đúng 6 chữ số');
  }

  const otp = await OtpCode.findOne({
    where: {
      email,
      code: normalizedCode,
      type,
      is_used: false,
      expires_at: { [Op.gt]: new Date() }
    },
    transaction,
  });

  if (!otp) throw new Error('Mã OTP không hợp lệ hoặc đã hết hạn');

  return otp;
};

exports.consumeOtp = async (otp, transaction) => {
  otp.is_used = true;
  await otp.save({ transaction });

  return true;
};

exports.verifyOtp = async (email, code, type, transaction) => {
  const otp = await exports.findValidOtp(email, code, type, transaction);
  return exports.consumeOtp(otp, transaction);
};

// re-export types so consumers can refer to constants rather than hardcoding strings
exports.OTP_TYPES = OTP_TYPES;
