// Fixed deposit: always 1 month regardless of contract length or billing cycle.
const DEPOSIT_MONTHS = 1;

const BOOKING_EXPIRY_MS = 60 * 60 * 1000; // 1 hour.
const MIN_CHECKIN_DAYS = 3; // Minimum lead time for contract signing flow.
const MAX_CHECKIN_DAYS = 10;

module.exports = {
    DEPOSIT_MONTHS,
    BOOKING_EXPIRY_MS,
    MIN_CHECKIN_DAYS,
    MAX_CHECKIN_DAYS,
};
