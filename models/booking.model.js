const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { BOOKING_BILLING_CYCLE } = require('../constants/bookingEnums');
const Room = require('./room.model');
const User = require('./user.model');
const Contract = require('./contract.model');
const Payment = require('./payment.model');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  booking_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: "bookings_booking_number_key"
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
  check_in_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  duration_months: {
    // TO-BE: only 6 or 12 months (DB check constraint enforces this)
    type: DataTypes.SMALLINT,
    allowNull: true,
    defaultValue: null
  },
  billing_cycle: {
    // TO-BE billing options at booking time.
    type: DataTypes.ENUM(...Object.values(BOOKING_BILLING_CYCLE)),
    allowNull: false,
    defaultValue: BOOKING_BILLING_CYCLE.ONE_MONTH
  },
  status: {
    type: DataTypes.ENUM("PENDING", "DEPOSIT_PAID", "CONVERTED", "CANCELLED"),
    allowNull: true,
    defaultValue: "PENDING"
  },
  room_price_snapshot: {
    type: DataTypes.DECIMAL,
    allowNull: false
  },
  deposit_amount: {
    type: DataTypes.DECIMAL,
    allowNull: false
  },
  deposit_payment_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'payments',
      key: 'id'
    }
  },
  deposit_paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  contract_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'contracts',
      key: 'id'
    }
  },
  converted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'bookings',
  schema: 'public',
  timestamps: true,
    underscored: true,
  indexes: [
    {
      name: "bookings_booking_number_key",
      unique: true,
      fields: [
        { name: "booking_number" },
      ]
    },
    {
      name: "bookings_pkey",
      unique: true,
      fields: [
        { name: "id" },
      ]
    },
    {
      name: "idx_bookings_booking_number",
      fields: [
        { name: "booking_number" },
      ]
    },
    {
      name: "idx_bookings_check_in_date",
      fields: [
        { name: "check_in_date" },
      ]
    },
    {
      name: "idx_bookings_billing_cycle",
      fields: [
        { name: "billing_cycle" },
      ]
    },
    {
      name: "idx_bookings_customer_id",
      fields: [
        { name: "customer_id" },
      ]
    },
    {
      name: "idx_bookings_expires_at",
      fields: [
        { name: "expires_at" },
      ]
    },
    {
      name: "idx_bookings_room_id",
      fields: [
        { name: "room_id" },
      ]
    }, {
      name: "idx_bookings_status",
      fields: [
        { name: "status" },
      ]
    },
  ]
});

Booking.associate = (models) => {
  Booking.belongsTo(models.Room, { foreignKey: 'room_id', as: 'room' });
  Booking.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
  Booking.belongsTo(models.Contract, { foreignKey: 'contract_id', as: 'contract' });
  Booking.belongsTo(models.Payment, { foreignKey: 'deposit_payment_id', as: 'payment' });
};

module.exports = Booking;
