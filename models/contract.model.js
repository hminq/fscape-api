const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { BOOKING_BILLING_CYCLE } = require('../constants/bookingEnums');
const User = require('./user.model');
const Room = require('./room.model');
const ContractTemplate = require('./contractTemplate.model');

const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contract_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: "contracts_contract_number_key"
  },
  template_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'contract_templates',
      key: 'id'
    }
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  manager_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  term_type: {
    type: DataTypes.ENUM("FIXED_TERM", "INDEFINITE"),
    allowNull: false,
    defaultValue: "FIXED_TERM"
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  duration_months: {
    // TO-BE: fixed-term contracts only allow 6 or 12 months.
    type: DataTypes.SMALLINT,
    allowNull: true
  },
  base_rent: {
    type: DataTypes.DECIMAL,
    allowNull: false
  },
  deposit_amount: {
    type: DataTypes.DECIMAL,
    allowNull: false
  },
  deposit_original_amount: {
    // Original deposit agreed at signing.
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  deposit_balance: {
    // Mutable deposit balance during checkout penalties/settlement.
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  billing_cycle: {
    // TO-BE: 1/3/6 months or all-in.
    type: DataTypes.ENUM(...Object.values(BOOKING_BILLING_CYCLE)),
    allowNull: false,
    defaultValue: BOOKING_BILLING_CYCLE.ONE_MONTH
  },
  next_billing_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  last_billed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  next_rent_billing_at: {
    // Next rent billing timestamp (UTC-based).
    type: DataTypes.DATE,
    allowNull: true
  },
  next_service_billing_at: {
    // Next service billing timestamp (+30 days cycle in UTC).
    type: DataTypes.DATE,
    allowNull: true
  },
  renewed_from_contract_id: {
    // Self-link for contract renewal chain.
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'contracts',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM("DRAFT", "PENDING_CUSTOMER_SIGNATURE", "PENDING_MANAGER_SIGNATURE", "ACTIVE", "EXPIRING_SOON", "FINISHED", "TERMINATED"),
    allowNull: true,
    defaultValue: "DRAFT"
  },
  customer_signature_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customer_signed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  manager_signature_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  manager_signed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  signature_expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rendered_content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dynamic_fields: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  pdf_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'contracts',
  schema: 'public',
  timestamps: true,
    underscored: true,
  indexes: [
    {
      name: "contracts_contract_number_key",
      unique: true,
      fields: [
        { name: "contract_number" },
      ]
    },
    {
      name: "contracts_pkey",
      unique: true,
      fields: [
        { name: "id" },
      ]
    },
    {
      name: "idx_contracts_contract_number",
      fields: [
        { name: "contract_number" },
      ]
    },
    {
      name: "idx_contracts_customer_id",
      fields: [
        { name: "customer_id" },
      ]
    },
    {
      name: "idx_contracts_end_date",
      fields: [
        { name: "end_date" },
      ]
    },
    {
      name: "idx_contracts_manager_id",
      fields: [
        { name: "manager_id" },
      ]
    },
    {
      name: "idx_contracts_next_billing_date",
      fields: [
        { name: "next_billing_date" },
      ]
    },
    {
      name: "idx_contracts_room_id",
      fields: [
        { name: "room_id" },
      ]
    },
    {
      name: "idx_contracts_start_date",
      fields: [
        { name: "start_date" },
      ]
    },
    {
      name: "idx_contracts_renewed_from_contract_id",
      fields: [
        { name: "renewed_from_contract_id" },
      ]
    }, {
      name: "idx_contracts_status",
      fields: [
        { name: "status" },
      ]
    },
  ]
});

Contract.associate = (models) => {
  Contract.belongsTo(models.Room, { foreignKey: 'room_id', as: 'room' });
  Contract.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
  Contract.belongsTo(models.User, { foreignKey: 'manager_id', as: 'manager' });
  Contract.belongsTo(models.ContractTemplate, { foreignKey: 'template_id', as: 'template' });
  Contract.belongsTo(models.Contract, { foreignKey: 'renewed_from_contract_id', as: 'renewed_from' });
  Contract.hasMany(models.Contract, { foreignKey: 'renewed_from_contract_id', as: 'renewals' });
  Contract.hasMany(models.ContractExtension, { foreignKey: 'contract_id', as: 'extensions' });
  Contract.hasMany(models.Invoice, { foreignKey: 'contract_id', as: 'invoices' });
  Contract.hasMany(models.Payment, { foreignKey: 'contract_id', as: 'payments' });
  Contract.hasOne(models.Settlement, { foreignKey: 'contract_id', as: 'settlement' });
  Contract.hasMany(models.ViolationPenalty, { foreignKey: 'contract_id', as: 'violation_penalties' });
};

module.exports = Contract;
