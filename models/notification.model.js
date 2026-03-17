const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user.model');

const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    target_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    target_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    reference_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    reference_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'notifications',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "idx_notifications_created_at",
        fields: [
          { name: "created_at" },
        ]
      },
      {
        name: "idx_notifications_target",
        fields: [
          { name: "target_type" },
          { name: "target_id" },
        ]
      },
      {
        name: "idx_notifications_type",
        fields: [
          { name: "type" },
        ]
      }, {
        name: "notifications_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

Notification.associate = (models) => {
  Notification.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });

  // NotificationRecipient relation
  Notification.hasMany(models.NotificationRecipient, { foreignKey: 'notification_id', as: 'recipients', onDelete: 'CASCADE' });
};
module.exports = Notification;
