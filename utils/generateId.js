/**
 * Tạo mã số dạng PREFIX-TIMESTAMP-RANDOM.
 * Ví dụ: BK-1709812345678-042
 *
 * @param {string} prefix - Prefix (VD: 'BK', 'PAY')
 * @returns {string}
 */
const generateNumberedId = (prefix) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
};

/**
 * Tạo mã số dạng PREFIX-YYYY-NNNN dựa trên count hiện tại.
 * Ví dụ: CON-2026-0001
 *
 * @param {string} prefix - Prefix (VD: 'CON')
 * @param {number} currentCount - Số lượng record hiện tại trong bảng
 * @returns {string}
 */
const generateSequentialId = (prefix, currentCount) => {
    const year = new Date().getFullYear();
    const seq = (currentCount + 1).toString().padStart(4, '0');
    return `${prefix}-${year}-${seq}`;
};

module.exports = { generateNumberedId, generateSequentialId };
