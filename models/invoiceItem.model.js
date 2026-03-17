const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InvoiceItem = sequelize.define('InvoiceItem', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    invoice_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'invoices',
        key: 'id'
      }
    },
    item_type: {
      type: DataTypes.ENUM("RENT","REQUEST","PENALTY","REFUND"),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 1
    },
    unit_price: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    reference_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    reference_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'invoice_items',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "idx_invoice_items_invoice_id",
        fields: [
          { name: "invoice_id" },
        ]
      },
      {
        name: "idx_invoice_items_item_type",
        fields: [
          { name: "item_type" },
        ]
      }, {
        name: "invoice_items_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

module.exports = InvoiceItem;
