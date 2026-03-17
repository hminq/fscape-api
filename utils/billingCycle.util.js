const {
  BOOKING_BILLING_CYCLE,
  LEGACY_BILLING_CYCLE_MAP,
  isValidBookingBillingCycle,
} = require('../constants/bookingEnums');

const normalizeBillingCycle = (cycle, fallback = BOOKING_BILLING_CYCLE.ONE_MONTH) => {
  if (!cycle) return fallback;
  if (isValidBookingBillingCycle(cycle)) return cycle;
  if (LEGACY_BILLING_CYCLE_MAP[cycle]) return LEGACY_BILLING_CYCLE_MAP[cycle];
  return fallback;
};

const billingCycleToMonths = (cycle) => {
  const normalized = normalizeBillingCycle(cycle);

  switch (normalized) {
    case BOOKING_BILLING_CYCLE.ONE_MONTH:
      return 1;
    case BOOKING_BILLING_CYCLE.THREE_MONTHS:
      return 3;
    case BOOKING_BILLING_CYCLE.SIX_MONTHS:
      return 6;
    case BOOKING_BILLING_CYCLE.ALL_IN:
      return null;
    default:
      return 1;
  }
};

const isAllInBillingCycle = (cycle) => {
  return normalizeBillingCycle(cycle) === BOOKING_BILLING_CYCLE.ALL_IN;
};

module.exports = {
  normalizeBillingCycle,
  billingCycleToMonths,
  isAllInBillingCycle,
};
