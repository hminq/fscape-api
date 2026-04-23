/**
 * Parse a YYYY-MM-DD string as UTC midnight.
 *
 * Sequelize DATEONLY columns return plain "YYYY-MM-DD" strings.
 * `new Date("2026-03-18")` already parses as UTC midnight, but this
 * helper is explicit and safe against edge-case browser/runtime
 * differences.
 *
 * @param {string|Date} date - "YYYY-MM-DD" string or Date object
 * @returns {Date} Date set to UTC midnight
 */
const parseUTCDate = (date) => {
    if (!date) return null;
    if (date instanceof Date) return date;
    const [y, m, d] = String(date).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};

/**
 * Get today's date string in UTC (YYYY-MM-DD).
 * @returns {string}
 */
const todayUTC = () => new Date().toISOString().split('T')[0];

module.exports = { parseUTCDate, todayUTC };
