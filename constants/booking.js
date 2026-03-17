// Fixed deposit: always 1 month regardless of contract length or billing cycle.
const DEPOSIT_MONTHS = 1;

const BOOKING_EXPIRY_MS = 60 * 60 * 1000; // 1 giờ
const MIN_CHECKIN_DAYS = 3; // Tối thiểu 3 ngày để 2 bên kí hợp đồng (2 × 24h)
const MAX_CHECKIN_DAYS = 10;

module.exports = {
    DEPOSIT_MONTHS,
    BOOKING_EXPIRY_MS,
    MIN_CHECKIN_DAYS,
    MAX_CHECKIN_DAYS,
};
