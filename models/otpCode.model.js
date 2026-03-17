const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OtpCode = sequelize.define('OtpCode', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM("EMAIL_VERIFICATION", "PASSWORD_RESET"),
    allowNull: false
  },
  is_used: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'otp_codes',
  schema: 'public',
  timestamps: true,
  updatedAt: false,
  underscored: true,
  indexes: [
    {
      name: "idx_otp_codes_expires_at",
      fields: [
        { name: "expires_at" },
      ]
    },
    {
      name: "idx_otp_codes_lookup",
      fields: [
        { name: "email" },
        { name: "type" },
        { name: "is_used" },
      ]
    }, {
      name: "otp_codes_pkey",
      unique: true,
      fields: [
        { name: "id" },
      ]
    },
  ]
});

const OTP_TYPES = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
};

module.exports = { OtpCode, OTP_TYPES };