const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { INVOICE_TYPE } = require('../constants/invoiceEnums');
const Contract = require('./contract.model');

const Invoice = sequelize.define('Invoice', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    invoice_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "invoices_invoice_number_key"
    },
    invoice_type: {
      // TO-BE invoice split: rent, service, settlement.
      type: DataTypes.ENUM(...Object.values(INVOICE_TYPE)),
      allowNull: false,
      defaultValue: INVOICE_TYPE.RENT
    },
    contract_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'contracts',
        key: 'id'
      }
    },
    billing_period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    billing_period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    room_rent: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    request_fees: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0
    },
    penalty_fees: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0
    },
    discount_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0
    },
    refund_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0
    },
    total_amount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("UNPAID","PAID","OVERDUE","CANCELLED"),
      allowNull: true,
      defaultValue: "UNPAID"
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'invoices',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_invoices_billing_period",
        fields: [
          { name: "billing_period_start" },
          { name: "billing_period_end" },
        ]
      },
      {
        name: "idx_invoices_contract_id",
        fields: [
          { name: "contract_id" },
        ]
      },
      {
        name: "idx_invoices_due_date",
        fields: [
          { name: "due_date" },
        ]
      },
      {
        name: "idx_invoices_invoice_number",
        fields: [
          { name: "invoice_number" },
        ]
      },
      {
        name: "idx_invoices_invoice_type",
        fields: [
          { name: "invoice_type" },
        ]
      },
      {
        name: "idx_invoices_status",
        fields: [
          { name: "status" },
        ]
      },
      {
        name: "invoices_invoice_number_key",
        unique: true,
        fields: [
          { name: "invoice_number" },
        ]
      }, {
        name: "invoices_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

Invoice.associate = (models) => {
  Invoice.belongsTo(models.Contract, { foreignKey: 'contract_id', as: 'contract' });
  Invoice.hasMany(models.InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
  Invoice.hasMany(models.Payment, { foreignKey: 'invoice_id', as: 'payments' });
};
module.exports = Invoice;
