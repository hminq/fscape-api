const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuthProvider = sequelize.define('AuthProvider', {
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
      },
      unique: "auth_providers_user_id_provider_key"
    },
    provider: {
      type: DataTypes.ENUM("EMAIL","GOOGLE"),
      allowNull: false,
      unique: "auth_providers_user_id_provider_key"
    },
    provider_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "auth_providers_provider_provider_id_key"
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    tableName: 'auth_providers',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "auth_providers_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "auth_providers_provider_provider_id_key",
        unique: true,
        fields: [
          { name: "provider" },
          { name: "provider_id" },
        ]
      },
      {
        name: "auth_providers_user_id_provider_key",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "provider" },
        ]
      },
      {
        name: "idx_auth_providers_lookup",
        fields: [
          { name: "provider" },
          { name: "provider_id" },
        ]
      }, {
        name: "idx_auth_providers_user_id",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
AuthProvider.associate = (models) => {
  AuthProvider.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'User'
  });
};
module.exports = { AuthProvider };
