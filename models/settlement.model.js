const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { SETTLEMENT_STATUS } = require('../constants/settlementEnums');

const Settlement = sequelize.define('Settlement', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contract_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'contracts',
      key: 'id'
    }
  },
  resident_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    // Checkout settlement lifecycle.
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: SETTLEMENT_STATUS.DRAFT,
    validate: {
      isIn: [Object.values(SETTLEMENT_STATUS)]
    }
  },
  deposit_original_amount: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0
  },
  deposit_balance_before: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0
  },
  total_penalty_amount: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0
  },
  total_unbilled_service_amount: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0
  },
  amount_due_from_resident: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0
  },
  amount_refund_to_resident: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0
  },
  finalized_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'settlements',
  schema: 'public',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_settlements_status',
      fields: [{ name: 'status' }]
    },
    {
      name: 'idx_settlements_resident_id',
      fields: [{ name: 'resident_id' }]
    }
  ]
});

Settlement.associate = (models) => {
  Settlement.belongsTo(models.Contract, { foreignKey: 'contract_id', as: 'contract' });
  Settlement.belongsTo(models.User, { foreignKey: 'resident_id', as: 'resident' });
  Settlement.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
  Settlement.hasMany(models.SettlementItem, { foreignKey: 'settlement_id', as: 'items' });
  Settlement.hasMany(models.Payment, { foreignKey: 'settlement_id', as: 'payments' });
  Settlement.hasMany(models.ViolationPenalty, { foreignKey: 'settled_settlement_id', as: 'settled_violations' });
};

module.exports = Settlement;
