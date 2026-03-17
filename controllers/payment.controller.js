const { sequelize } = require("../config/db");
const paymentService = require("../services/payment.service");
const { verifyIpnSignature } = require('../utils/vnpay');
const getClientIp = () => "127.0.0.1";

const createBookingPaymentUrl = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.body;
        const ipAddr = getClientIp(req);

        const result = await paymentService.createBookingPaymentUrl(userId, bookingId, ipAddr);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Lỗi tạo thanh toán" });
    }
};

const createInvoicePaymentUrl = async (req, res) => {
    try {
        const userId = req.user.id;
        const { invoiceId } = req.body;
        const ipAddr = getClientIp(req);

        const result = await paymentService.createInvoicePaymentUrl(userId, invoiceId, ipAddr);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Lỗi tạo thanh toán" });
    }
};

const vnpayIpn = async (req, res) => {
    try {
        console.log(`[VNPay IPN] ${new Date().toISOString()} from ${req.ip}`);
        console.log('[VNPay IPN] Query:', JSON.stringify(req.query));
        const query = req.query;
        const result = await paymentService.vnpayIpn(query);
        console.log('[VNPay IPN] Processed result:', result);
        return res.status(200).json(result);
    } catch (error) {
        console.error('[VNPay IPN] Error:', error.message, error.stack);
        return res.status(200).json({ RspCode: '99', Message: 'Internal Server Error' });
    }
};

const vnpayReturn = async (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const code = req.query.vnp_ResponseCode || 'unknown';
    const txnRef = req.query.vnp_TxnRef || '';
    return res.redirect(`${clientUrl}/payment/result?vnp_ResponseCode=${code}&vnp_TxnRef=${txnRef}`);
};

const getMyPayments = async (req, res) => {
    const { Payment, Booking, Room, Building } = sequelize.models;
    const userId = req.user.id;

    try {
        const payments = await Payment.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: Booking,
                    as: 'booking',
                    include: [
                        {
                            model: Room,
                            as: 'room',
                            include: [{ model: Building, as: 'building' }]
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return res.status(200).json({
            data: payments
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

module.exports = {
    createBookingPaymentUrl,
    createInvoicePaymentUrl,
    vnpayIpn,
    vnpayReturn,
    getMyPayments
};
