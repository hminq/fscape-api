const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { PAYMENT_TYPE } = require('../constants/paymentEnums');
const User = require('./user.model');
const Invoice = require('./invoice.model');
const Contract = require('./contract.model');

const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    payment_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "payments_payment_number_key"
    },
    invoice_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'invoices',
        key: 'id'
      }
    },
    contract_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'contracts',
        key: 'id'
      }
    },
    settlement_id: {
      // Optional link when collecting/returning final settlement money.
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'settlements',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    payment_type: {
      type: DataTypes.ENUM(...Object.values(PAYMENT_TYPE)),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("PENDING","PROCESSING","SUCCESS","FAILED","CANCELLED","REFUNDED"),
      allowNull: true,
      defaultValue: "PENDING"
    },
    gateway_transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    gateway_response: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'payments',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_payments_contract_id",
        fields: [
          { name: "contract_id" },
        ]
      },
      {
        name: "idx_payments_gateway_transaction_id",
        fields: [
          { name: "gateway_transaction_id" },
        ]
      },
      {
        name: "idx_payments_invoice_id",
        fields: [
          { name: "invoice_id" },
        ]
      },
      {
        name: "idx_payments_payment_number",
        fields: [
          { name: "payment_number" },
        ]
      },
      {
        name: "idx_payments_settlement_id",
        fields: [
          { name: "settlement_id" },
        ]
      },
      {
        name: "idx_payments_status",
        fields: [
          { name: "status" },
        ]
      },
      {
        name: "idx_payments_user_id",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "payments_payment_number_key",
        unique: true,
        fields: [
          { name: "payment_number" },
        ]
      }, {
        name: "payments_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

Payment.associate = (models) => {
  Payment.belongsTo(models.User, { foreignKey: 'user_id', as: 'payer' });
  Payment.belongsTo(models.Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
  Payment.belongsTo(models.Contract, { foreignKey: 'contract_id', as: 'contract' });
  Payment.belongsTo(models.Settlement, { foreignKey: 'settlement_id', as: 'settlement' });
  Payment.hasOne(models.Booking, { foreignKey: 'deposit_payment_id', as: 'booking' });
};
module.exports = Payment;
