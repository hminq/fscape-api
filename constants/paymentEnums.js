// constants/paymentEnums.js
// Domain enums for payment type classification.

const PAYMENT_TYPE = Object.freeze({
  DEPOSIT: 'DEPOSIT',
  RENT: 'RENT',
  REQUEST: 'REQUEST',
  REFUND: 'REFUND',
  SERVICE: 'SERVICE',
  SETTLEMENT: 'SETTLEMENT',
});

module.exports = { PAYMENT_TYPE };
