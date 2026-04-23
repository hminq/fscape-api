/**
 * Generate ID in PREFIX-TIMESTAMP-RANDOM format.
 * Example: BK-1709812345678-042
 *
 * @param {string} prefix - Prefix (e.g., 'BK', 'PAY')
 * @returns {string}
 */
const generateNumberedId = (prefix) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
};

/**
 * Generate ID in PREFIX-YYYY-NNNN format from current record count.
 * Example: CON-2026-0001
 *
 * @param {string} prefix - Prefix (e.g., 'CON')
 * @param {number} currentCount - Current record count in the table
 * @returns {string}
 */
const generateSequentialId = (prefix, currentCount) => {
    const year = new Date().getFullYear();
    const seq = (currentCount + 1).toString().padStart(4, '0');
    return `${prefix}-${year}-${seq}`;
};

module.exports = { generateNumberedId, generateSequentialId };
