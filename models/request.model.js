const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { REQUEST_SERVICE_BILLING_STATUS } = require('../constants/invoiceEnums');

const Request = sequelize.define('Request', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  request_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: "requests_request_number_key"
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false,
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
  assigned_staff_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  request_type: {
    type: DataTypes.ENUM("REPAIR", "CLEANING", "COMPLAINT", "ASSET_CHANGE", "CHECKOUT", "OTHER"),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM("PENDING", "ASSIGNED", "PRICE_PROPOSED", "APPROVED", "IN_PROGRESS", "DONE", "COMPLETED", "REVIEWED", "REFUNDED", "CANCELLED"),
    allowNull: true,
    defaultValue: "PENDING"
  },
  related_asset_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'assets',
      key: 'id'
    }
  },
  custom_item_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  request_price: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  completion_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  feedback_rating: {
    type: DataTypes.SMALLINT,
    allowNull: true
  },
  feedback_comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  feedback_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  report_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reported_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refund_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  refund_approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  refund_approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  service_billing_status: {
    // Prevent duplicate billing for request/service fees.
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: REQUEST_SERVICE_BILLING_STATUS.UNBILLED,
    validate: {
      isIn: [Object.values(REQUEST_SERVICE_BILLING_STATUS)]
    }
  },
  service_billed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  service_billed_invoice_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'invoices',
      key: 'id'
    }
  }
}, {
  tableName: 'requests',
  schema: 'public',
  timestamps: true,
    underscored: true,
  indexes: [
    {
      name: "idx_requests_assigned_staff_id",
      fields: [
        { name: "assigned_staff_id" },
      ]
    },
    {
      name: "idx_requests_created_at",
      fields: [
        { name: "created_at" },
      ]
    },
    {
      name: "idx_requests_request_number",
      fields: [
        { name: "request_number" },
      ]
    },
    {
      name: "idx_requests_request_type",
      fields: [
        { name: "request_type" },
      ]
    },
    {
      name: "idx_requests_resident_id",
      fields: [
        { name: "resident_id" },
      ]
    },
    {
      name: "idx_requests_room_id",
      fields: [
        { name: "room_id" },
      ]
    },
    {
      name: "idx_requests_status",
      fields: [
        { name: "status" },
      ]
    },
    {
      name: "idx_requests_service_billing_status",
      fields: [
        { name: "service_billing_status" },
      ]
    },
    {
      name: "requests_pkey",
      unique: true,
      fields: [
        { name: "id" },
      ]
    }, {
      name: "requests_request_number_key",
      unique: true,
      fields: [
        { name: "request_number" },
      ]
    },
  ]
});

Request.associate = (models) => {
  Request.belongsTo(models.Room, { foreignKey: 'room_id', as: 'room' });
  Request.belongsTo(models.User, { foreignKey: 'resident_id', as: 'resident' });
  Request.belongsTo(models.User, { foreignKey: 'assigned_staff_id', as: 'staff' });
  Request.belongsTo(models.Asset, { foreignKey: 'related_asset_id', as: 'asset' });
  Request.belongsTo(models.User, { foreignKey: 'refund_approved_by', as: 'refund_approver' });
  Request.belongsTo(models.Invoice, { foreignKey: 'service_billed_invoice_id', as: 'service_billed_invoice' });

  Request.hasMany(models.RequestImage, { foreignKey: 'request_id', as: 'images', onDelete: 'CASCADE' });
  Request.hasMany(models.RequestStatusHistory, { foreignKey: 'request_id', as: 'status_history', onDelete: 'CASCADE' });
};

module.exports = Request;
