const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { SETTLEMENT_ITEM_TYPE } = require('../constants/settlementEnums');

const SettlementItem = sequelize.define('SettlementItem', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  settlement_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'settlements',
      key: 'id'
    }
  },
  item_type: {
    // Classification for audit-friendly settlement breakdown.
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {
      isIn: [Object.values(SETTLEMENT_ITEM_TYPE)]
    }
  },
  reference_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  reference_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 1
  },
  unit_amount: {
    type: DataTypes.DECIMAL,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  }
}, {
  tableName: 'settlement_items',
  schema: 'public',
  timestamps: true,
  updatedAt: false,
  underscored: true,
  indexes: [
    {
      name: 'idx_settlement_items_settlement_id',
      fields: [{ name: 'settlement_id' }]
    },
    {
      name: 'idx_settlement_items_item_type',
      fields: [{ name: 'item_type' }]
    }
  ]
});

SettlementItem.associate = (models) => {
  SettlementItem.belongsTo(models.Settlement, { foreignKey: 'settlement_id', as: 'settlement' });
};

module.exports = SettlementItem;
