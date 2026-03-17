const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const EmailTemplate = require('./emailTemplate.model');
const User = require('./user.model');

const EmailLog = sequelize.define('EmailLog', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    template_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'email_templates',
        key: 'id'
      }
    },
    recipient_email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    recipient_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "PENDING"
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'email_logs',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "email_logs_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_email_logs_created_at",
        fields: [
          { name: "created_at" },
        ]
      },
      {
        name: "idx_email_logs_recipient_email",
        fields: [
          { name: "recipient_email" },
        ]
      }, {
        name: "idx_email_logs_status",
        fields: [
          { name: "status" },
        ]
      },
    ]
  });

EmailLog.associate = (models) => {
  EmailLog.belongsTo(models.EmailTemplate, { foreignKey: 'template_id', as: 'template' });
  EmailLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'recipient' });
};
module.exports = EmailLog;
