const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: "refresh_tokens_token_key"
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'refresh_tokens',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "idx_refresh_tokens_expires_at",
        fields: [
          { name: "expires_at" },
        ]
      },
      {
        name: "idx_refresh_tokens_token",
        unique: true,
        fields: [
          { name: "token" },
        ]
      },
      {
        name: "idx_refresh_tokens_user_id",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "refresh_tokens_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      }, {
        name: "refresh_tokens_token_key",
        unique: true,
        fields: [
          { name: "token" },
        ]
      },
    ]
  });

module.exports = RefreshToken;
