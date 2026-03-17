const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user.model');

const CustomerProfile = sequelize.define('CustomerProfile', {
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
      unique: "customer_profiles_user_id_key"
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    permanent_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emergency_contact_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    emergency_contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    }
  }, {
    tableName: 'customer_profiles',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "customer_profiles_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "customer_profiles_user_id_key",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      }, {
        name: "idx_customer_profiles_user_id",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });

CustomerProfile.associate = (models) => {
  CustomerProfile.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
};
module.exports = CustomerProfile;
