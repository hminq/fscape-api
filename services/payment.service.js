const { sequelize } = require('../config/db');
const { createPaymentUrl, verifyIpnSignature } = require('../utils/vnpay');
const contractService = require('./contract.service');

const createBookingPaymentUrl = async (userId, bookingId, ipAddr) => {
    const { Booking, Payment } = sequelize.models;

    const booking = await Booking.findOne({
        where: { id: bookingId, customer_id: userId, status: 'PENDING' }
    });

    if (!booking) {
        throw { status: 404, message: "Không tìm thấy đơn đặt phòng hợp lệ hoặc đơn đã được xử lý" };
    }

    // 1. Tạo bản ghi Payment
    const paymentNumber = `PAY-${Date.now()}`;
    const payment = await Payment.create({
        payment_number: paymentNumber,
        user_id: userId,
        amount: booking.deposit_amount,
        payment_type: 'DEPOSIT',
        status: 'PENDING'
    });

    // 2. Liên kết payment vào booking
    await booking.update({ deposit_payment_id: payment.id });

    // 3. Tạo URL thanh toán
    const returnUrl = process.env.VNP_RETURN_URL;
    const vnpUrl = createPaymentUrl({
        ipAddr,
        amount: booking.deposit_amount,
        orderInfo: `${booking.booking_number}`,
        returnUrl,
        txnRef: paymentNumber
    });

    // Ghi nhận mã giao dịch vào gateway_transaction_id nháp
    await payment.update({ gateway_transaction_id: paymentNumber });

    return { paymentUrl: vnpUrl };
};

const createInvoicePaymentUrl = async (userId, invoiceId, ipAddr) => {
    const { Invoice, Payment, Contract } = sequelize.models;

    const invoice = await Invoice.findOne({
        where: { id: invoiceId, status: 'UNPAID' },
        include: [{ model: Contract, as: 'contract', where: { customer_id: userId } }]
    });

    if (!invoice) {
        throw { status: 404, message: "Không tìm thấy hóa đơn cần thanh toán" };
    }

    const paymentType = invoice.invoice_type === 'SERVICE' ? 'SERVICE' : 'RENT';
    const paymentNumber = `PAY-INV-${Date.now()}`;
    const payment = await Payment.create({
        payment_number: paymentNumber,
        invoice_id: invoice.id,
        contract_id: invoice.contract_id,
        user_id: userId,
        amount: invoice.total_amount,
        payment_type: paymentType,
        status: 'PENDING'
    });

    const returnUrl = process.env.VNP_RETURN_URL;
    const vnpUrl = createPaymentUrl({
        ipAddr,
        amount: invoice.total_amount,
        orderInfo: `${invoice.invoice_number}`,
        returnUrl,
        txnRef: paymentNumber
    });

    await payment.update({ gateway_transaction_id: paymentNumber });

    return { paymentUrl: vnpUrl };
};

const vnpayIpn = async (query) => {
    const { Payment, Booking, Invoice } = sequelize.models;

    const isValidSignature = verifyIpnSignature(query);
    if (!isValidSignature) {
        return { RspCode: '97', Message: 'Checksum failed' };
    }

    const txnRef = query['vnp_TxnRef'];
    const amountStr = query['vnp_Amount'];
    const responseCode = query['vnp_ResponseCode'];

    // Tìm giao dịch
    const payment = await Payment.findOne({ where: { payment_number: txnRef } });

    if (!payment) {
        return { RspCode: '01', Message: 'Order not found' };
    }

    // Kiểm tra số tiền hợp lệ (vnp_Amount gửi lên nguyên bản nhân 100)
    const vnpAmount = amountStr / 100;
    if (Number(payment.amount) !== vnpAmount) {
        return { RspCode: '04', Message: 'Invalid amount' };
    }

    // Idempotency check 
    if (payment.status === 'SUCCESS' || payment.status === 'FAILED') {
        return { RspCode: '02', Message: 'Order already confirmed' };
    }

    // Nếu thanh toán thất bại
    if (responseCode !== '00') {
        await payment.update({
            status: 'FAILED',
            gateway_response: query
        });
        return { RspCode: '00', Message: 'Confirm Success (Failed Transaction)' };
    }

    // Thanh toán thành công -> xử lý theo payment_type
    const transaction = await sequelize.transaction();

    try {
        await payment.update({
            status: 'SUCCESS',
            paid_at: new Date(),
            gateway_response: query
        }, { transaction });

        let depositPaidBookingId = null;

        if (payment.payment_type === 'DEPOSIT') {
            const booking = await Booking.findOne({ where: { deposit_payment_id: payment.id }, transaction });
            if (booking) {
                await booking.update({
                    status: 'DEPOSIT_PAID',
                    deposit_paid_at: new Date()
                }, { transaction });
                depositPaidBookingId = booking.id;
            }
        } else if (payment.payment_type === 'RENT' || payment.payment_type === 'SERVICE') {
            // Xử lý Hóa đơn (rent hoặc service)
            const invoice = await Invoice.findByPk(payment.invoice_id, { transaction });
            if (invoice) {
                await invoice.update({
                    status: 'PAID',
                    paid_at: new Date()
                }, { transaction });
            }
        }

        await transaction.commit();

        // Tạo contract ngoài transaction (contractService tự quản lý transaction riêng)
        if (depositPaidBookingId) {
            contractService.createContractFromBooking(depositPaidBookingId)
                .catch(err => console.error('[PaymentService] Failed to create contract:', err));
        }

        return { RspCode: '00', Message: 'Confirm Success' };
    } catch (err) {
        await transaction.rollback();
        console.error("IPN Process Error:", err);
        return { RspCode: '99', Message: 'Internal processing error' };
    }
};

module.exports = {
    createBookingPaymentUrl,
    createInvoicePaymentUrl,
    vnpayIpn
};
