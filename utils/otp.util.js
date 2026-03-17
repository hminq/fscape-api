const { OtpCode, OTP_TYPES } = require('../models/otpCode.model');
const { Op } = require('sequelize');

const OTP_EXPIRE_MINUTES = 20;
const OTP_LIMIT_PER_DAY = 5;

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
    throw new Error('OTP request limit exceeded (5/day)');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  return OtpCode.create({
    email,
    code,
    type,
    expires_at: new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000)
  });
};

exports.verifyOtp = async (email, code, type) => {
  const otp = await OtpCode.findOne({
    where: {
      email,
      code,
      type,
      is_used: false,
      expires_at: { [Op.gt]: new Date() }
    }
  });

  if (!otp) throw new Error('Invalid or expired OTP');

  otp.is_used = true;
  await otp.save();

  return true;
};

// re-export types so consumers can refer to constants rather than hardcoding strings
exports.OTP_TYPES = OTP_TYPES;