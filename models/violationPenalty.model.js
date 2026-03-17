const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { VIOLATION_PENALTY_STATUS } = require('../constants/settlementEnums');

const ViolationPenalty = sequelize.define('ViolationPenalty', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contract_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'contracts',
      key: 'id'
    }
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'rooms',
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
  penalty_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL,
    allowNull: false
  },
  status: {
    // Lifecycle of non-asset penalties before settlement/invoice closure.
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: VIOLATION_PENALTY_STATUS.PENDING,
    validate: {
      isIn: [Object.values(VIOLATION_PENALTY_STATUS)]
    }
  },
  issued_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  settled_invoice_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  settled_settlement_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'settlements',
      key: 'id'
    }
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
  tableName: 'violation_penalties',
  schema: 'public',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_violation_penalties_contract_id',
      fields: [{ name: 'contract_id' }]
    },
    {
      name: 'idx_violation_penalties_status',
      fields: [{ name: 'status' }]
    }
  ]
});

ViolationPenalty.associate = (models) => {
  ViolationPenalty.belongsTo(models.Contract, { foreignKey: 'contract_id', as: 'contract' });
  ViolationPenalty.belongsTo(models.Room, { foreignKey: 'room_id', as: 'room' });
  ViolationPenalty.belongsTo(models.User, { foreignKey: 'resident_id', as: 'resident' });
  ViolationPenalty.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approver' });
  ViolationPenalty.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
  ViolationPenalty.belongsTo(models.Invoice, { foreignKey: 'settled_invoice_id', as: 'settled_invoice' });
  ViolationPenalty.belongsTo(models.Settlement, { foreignKey: 'settled_settlement_id', as: 'settled_settlement' });
};

module.exports = ViolationPenalty;
