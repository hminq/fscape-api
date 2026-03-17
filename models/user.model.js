const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: "users_email_key"
  },
  role: {
    type: DataTypes.ENUM("ADMIN", "BUILDING_MANAGER", "STAFF", "RESIDENT", "CUSTOMER"),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  building_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'buildings',
      key: 'id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true
  }
}, {
  tableName: 'users',
  schema: 'public',
  timestamps: true,
    underscored: true,
  indexes: [
    {
      name: "idx_users_building_id",
      fields: [
        { name: "building_id" },
      ]
    },
    {
      name: "idx_users_email",
      unique: true,
      fields: [
        { name: "email" },
      ]
    },
    {
      name: "idx_users_is_active",
      fields: [
        { name: "is_active" },
      ]
    },
    {
      name: "idx_users_phone",
      fields: [
        { name: "phone" },
      ]
    },
    {
      name: "idx_users_role",
      fields: [
        { name: "role" },
      ]
    },
    {
      name: "users_email_key",
      unique: true,
      fields: [
        { name: "email" },
      ]
    }, {
      name: "users_pkey",
      unique: true,
      fields: [
        { name: "id" },
      ]
    },
  ]
});
User.associate = (models) => {
  User.hasOne(models.CustomerProfile, { foreignKey: 'user_id', as: 'profile' });
  User.hasMany(models.AuthProvider, { foreignKey: 'user_id' });
  User.hasMany(models.Booking, { foreignKey: 'customer_id', as: 'bookings' });
  User.hasMany(models.Payment, { foreignKey: 'user_id', as: 'payments' });
  User.hasMany(models.AuthProvider, {
    foreignKey: 'user_id',
    as: 'authProviders'
  });
};
module.exports = User;
