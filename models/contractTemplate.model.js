const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ContractTemplate = sequelize.define('ContractTemplate', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    variables: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
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
    tableName: 'contract_templates',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "contract_templates_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_contract_templates_is_active",
        fields: [
          { name: "is_active" },
        ]
      }, {
        name: "idx_contract_templates_is_default",
        fields: [
          { name: "is_default" },
        ]
      },
    ]
  });

module.exports = ContractTemplate;
