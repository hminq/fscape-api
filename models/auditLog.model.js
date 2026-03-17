const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user.model');

const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    user_role: {
      type: DataTypes.ENUM("ADMIN","BUILDING_MANAGER","STAFF","RESIDENT","CUSTOMER"),
      allowNull: true
    },
    action: {
      type: DataTypes.ENUM("CREATE","UPDATE","DELETE","LOGIN","LOGOUT","SIGN","APPROVE","REJECT","ASSIGN"),
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    old_value: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    new_value: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'audit_logs',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "audit_logs_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_audit_logs_action",
        fields: [
          { name: "action" },
        ]
      },
      {
        name: "idx_audit_logs_created_at",
        fields: [
          { name: "created_at" },
        ]
      },
      {
        name: "idx_audit_logs_entity",
        fields: [
          { name: "entity_type" },
          { name: "entity_id" },
        ]
      }, {
        name: "idx_audit_logs_user_id",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });

AuditLog.associate = (models) => {
  AuditLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'performer' });
};
module.exports = AuditLog;
