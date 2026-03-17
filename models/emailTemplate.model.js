const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EmailTemplate = sequelize.define('EmailTemplate', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    template_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "email_templates_template_key_key"
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    body_html: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    body_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    variables: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    tableName: 'email_templates',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "email_templates_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "email_templates_template_key_key",
        unique: true,
        fields: [
          { name: "template_key" },
        ]
      }, {
        name: "idx_email_templates_template_key",
        fields: [
          { name: "template_key" },
        ]
      },
    ]
  });

module.exports = EmailTemplate;
