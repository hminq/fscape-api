// constants/bookingEnums.js
// Domain enums for booking and contract-length validation.

const BOOKING_BILLING_CYCLE = Object.freeze({
  ONE_MONTH: 'CYCLE_1M',
  THREE_MONTHS: 'CYCLE_3M',
  SIX_MONTHS: 'CYCLE_6M',
  ALL_IN: 'ALL_IN',
});

// Keep duration as numeric months for DB compatibility.
const CONTRACT_LENGTH = Object.freeze({
  SIX_MONTHS: 6,
  TWELVE_MONTHS: 12,
});

const CONTRACT_LENGTH_MONTHS = Object.freeze(Object.values(CONTRACT_LENGTH));

const LEGACY_BILLING_CYCLE_MAP = Object.freeze({
  MONTHLY: BOOKING_BILLING_CYCLE.ONE_MONTH,
  QUARTERLY: BOOKING_BILLING_CYCLE.THREE_MONTHS,
  SEMI_ANNUALLY: BOOKING_BILLING_CYCLE.SIX_MONTHS,
});

const isValidContractLength = (value) => {
  const parsed = Number(value);
  return CONTRACT_LENGTH_MONTHS.includes(parsed);
};

const isValidBookingBillingCycle = (value) => {
  return Object.values(BOOKING_BILLING_CYCLE).includes(value);
};

module.exports = {
  BOOKING_BILLING_CYCLE,
  CONTRACT_LENGTH,
  CONTRACT_LENGTH_MONTHS,
  LEGACY_BILLING_CYCLE_MAP,
  isValidContractLength,
  isValidBookingBillingCycle,
};
