/**
 * Parse a YYYY-MM-DD date string as local midnight.
 *
 * `new Date("2026-03-18")` parses as UTC midnight, which shifts the date
 * in non-UTC timezones. This helper avoids that by using the
 * three-argument Date constructor, which always uses local time.
 *
 * @param {string|Date} date - "YYYY-MM-DD" string or Date object
 * @returns {Date} Date set to local midnight
 */
const parseLocalDate = (date) => {
    if (!date) return null;
    if (date instanceof Date) return date;
    const [y, m, d] = String(date).split('-').map(Number);
    return new Date(y, m - 1, d);
};

module.exports = { parseLocalDate };
