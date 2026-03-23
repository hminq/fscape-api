const { PayOS } = require("@payos/node");

// Lazy initialization: chỉ tạo instance khi PayOS được cấu hình
let _payos = null;

function getPayOS() {
    if (!_payos) {
        if (!process.env.PAYOS_CLIENT_ID) {
            throw new Error("PayOS chưa được cấu hình. Vui lòng đặt PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env");
        }
        _payos = new PayOS();
    }
    return _payos;
}

module.exports = getPayOS;
