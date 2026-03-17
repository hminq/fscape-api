const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Notification = require('./notification.model');
const User = require('./user.model');

const NotificationRecipient = sequelize.define('NotificationRecipient', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    notification_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'notifications',
        key: 'id'
      },
      unique: "notification_recipients_notification_id_user_id_key"
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      unique: "notification_recipients_notification_id_user_id_key"
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'notification_recipients',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "idx_notification_recipients_is_read",
        fields: [
          { name: "is_read" },
        ]
      },
      {
        name: "idx_notification_recipients_notification_id",
        fields: [
          { name: "notification_id" },
        ]
      },
      {
        name: "idx_notification_recipients_user_id",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "notification_recipients_notification_id_user_id_key",
        unique: true,
        fields: [
          { name: "notification_id" },
          { name: "user_id" },
        ]
      }, {
        name: "notification_recipients_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

NotificationRecipient.associate = (models) => {
  NotificationRecipient.belongsTo(models.Notification, { foreignKey: 'notification_id' });
  NotificationRecipient.belongsTo(models.User, { foreignKey: 'user_id' });
};
module.exports = NotificationRecipient;
