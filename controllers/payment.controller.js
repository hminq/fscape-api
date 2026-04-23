const { sequelize } = require("../config/db");
const paymentService = require("../services/payment.service");

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

// PayOS handlers.

const createBookingPaymentUrlPayOS = async (req, res) => {
    try {
        const userId = req.user.id;
        const { booking_id } = req.body;
        const result = await paymentService.createBookingPaymentUrlPayOS(userId, booking_id);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Lỗi tạo thanh toán" });
    }
};

const createInvoicePaymentUrlPayOS = async (req, res) => {
    try {
        const userId = req.user.id;
        const { invoice_id } = req.body;
        const result = await paymentService.createInvoicePaymentUrlPayOS(userId, invoice_id);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Lỗi tạo thanh toán" });
    }
};

const payosWebhook = async (req, res) => {
    try {
        console.log(`[PayOS Webhook] ${new Date().toISOString()} from ${req.ip}`);
        console.log('[PayOS Webhook] Body:', JSON.stringify(req.body));
        const result = await paymentService.payosWebhook(req.body);
        return res.status(200).json(result);
    } catch (error) {
        console.error('[PayOS Webhook] Error:', error.message, error.stack);
        return res.status(200).json({ success: true });
    }
};

const payosReturn = async (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const { code, id, cancel, status, orderCode } = req.query;
    return res.redirect(
        `${clientUrl}/payment/result?code=${code}&id=${id || ''}&cancel=${cancel || 'false'}&status=${status || ''}&orderCode=${orderCode || ''}`
    );
};

module.exports = {
    createBookingPaymentUrlPayOS,
    createInvoicePaymentUrlPayOS,
    payosWebhook,
    payosReturn,
    getMyPayments
};
