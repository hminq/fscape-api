const { sequelize } = require('../config/db');
const getPayOS = require('../utils/payos');
const payosConfig = require('../config/payos.config');
const contractService = require('./contract.service');

/**
 * Số tiền gửi tới PayOS (hỗ trợ test với số tiền nhỏ).
 * Nếu PAYOS_TEST_AMOUNT được đặt, dùng giá trị đó thay vì giá thật.
 */
const getPayosAmount = (realAmount) => {
    const testAmount = process.env.PAYOS_TEST_AMOUNT;
    if (testAmount) return Number(testAmount);
    return Math.round(Number(realAmount));
};

const createBookingPaymentUrlPayOS = async (userId, bookingId) => {
    const { Booking, Payment } = sequelize.models;

    const booking = await Booking.findOne({
        where: { id: bookingId, customer_id: userId, status: 'PENDING' }
    });

    if (!booking) {
        throw { status: 404, message: "Không tìm thấy đơn đặt phòng hợp lệ hoặc đơn đã được xử lý" };
    }

    const orderCode = Date.now();
    const paymentNumber = `PAY-${orderCode}`;

    const payment = await Payment.create({
        payment_number: paymentNumber,
        user_id: userId,
        amount: booking.deposit_amount, // lưu giá thật vào DB
        payment_type: 'DEPOSIT',
        status: 'PENDING',
        gateway_transaction_id: String(orderCode)
    });

    await booking.update({ deposit_payment_id: payment.id });

    // Hết hạn sau 1 giờ 
    const expiredAt = Math.floor(Date.now() / 1000) + 3600;

    const paymentLink = await getPayOS().paymentRequests.create({
        orderCode,
        amount: getPayosAmount(booking.deposit_amount),
        description: booking.booking_number,
        items: [{ name: `Đặt cọc ${booking.booking_number}`, quantity: 1, price: getPayosAmount(booking.deposit_amount) }],
        returnUrl: payosConfig.returnUrl,
        cancelUrl: payosConfig.cancelUrl,
        expiredAt,
    });

    return { checkoutUrl: paymentLink.checkoutUrl, orderCode, amount: booking.deposit_amount };
};

const createInvoicePaymentUrlPayOS = async (userId, invoiceId) => {
    const { Invoice, Payment, Contract } = sequelize.models;

    const invoice = await Invoice.findOne({
        where: { id: invoiceId, status: 'UNPAID' },
        include: [{ model: Contract, as: 'contract', where: { customer_id: userId } }]
    });

    if (!invoice) {
        throw { status: 404, message: "Không tìm thấy hóa đơn cần thanh toán" };
    }

    const paymentType = invoice.invoice_type === 'SERVICE' ? 'SERVICE' : 'RENT';
    const orderCode = Date.now();
    const paymentNumber = `PAY-INV-${orderCode}`;

    const payment = await Payment.create({
        payment_number: paymentNumber,
        invoice_id: invoice.id,
        contract_id: invoice.contract_id,
        user_id: userId,
        amount: invoice.total_amount,
        payment_type: paymentType,
        status: 'PENDING',
        gateway_transaction_id: String(orderCode)
    });

    // Hết hạn sau 24 giờ
    const expiredAt = Math.floor(Date.now() / 1000) + 86400;

    const paymentLink = await getPayOS().paymentRequests.create({
        orderCode,
        amount: getPayosAmount(invoice.total_amount),
        description: invoice.invoice_number,
        items: [{ name: `Thanh toán ${invoice.invoice_number}`, quantity: 1, price: getPayosAmount(invoice.total_amount) }],
        returnUrl: payosConfig.returnUrl,
        cancelUrl: payosConfig.cancelUrl,
        expiredAt,
    });

    return { checkoutUrl: paymentLink.checkoutUrl, orderCode, amount: invoice.total_amount };
};

/**
 * Xử lý chung sau khi thanh toán thành công cho PayOS webhook.
 */
const processSuccessPayment = async (payment, gatewayResponse) => {
    const { Booking, Invoice } = sequelize.models;
    const transaction = await sequelize.transaction();

    try {
        await payment.update({
            status: 'SUCCESS',
            paid_at: new Date(),
            gateway_response: gatewayResponse
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
            const invoice = await Invoice.findByPk(payment.invoice_id, { transaction });
            if (invoice) {
                await invoice.update({
                    status: 'PAID',
                    paid_at: new Date()
                }, { transaction });

                const { Contract, User, Room, Building } = sequelize.models;
                const contract = await Contract.findByPk(invoice.contract_id, { transaction });

                if (contract && contract.status === 'PENDING_FIRST_PAYMENT') {
                    if (invoice.billing_period_start === contract.start_date) {
                        if (contract.renewed_from_contract_id) {
                            await contract.update({ status: 'ACTIVE' }, { transaction });

                            const oldContract = await Contract.findByPk(
                                contract.renewed_from_contract_id, { transaction }
                            );
                            if (oldContract && ['ACTIVE', 'EXPIRING_SOON', 'FINISHED'].includes(oldContract.status)) {
                                await oldContract.update({ status: 'FINISHED' }, { transaction });
                            }
                        } else {
                            await contract.update({ status: 'PENDING_CHECK_IN' }, { transaction });

                            const customer = await User.findByPk(contract.customer_id, { transaction });
                            if (customer && customer.role === 'CUSTOMER') {
                                const room = await Room.findByPk(contract.room_id, {
                                    include: [{ model: Building, as: 'building' }],
                                    transaction
                                });
                                await customer.update({
                                    role: 'RESIDENT',
                                    building_id: room?.building?.id || room?.building_id
                                }, { transaction });
                            }
                        }
                    }
                }
            }
        }

        await transaction.commit();

        if (depositPaidBookingId) {
            contractService.createContractFromBooking(depositPaidBookingId)
                .catch(err => console.error('[PaymentService] Failed to create contract:', err));
        }

        return true;
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

const payosWebhook = async (body) => {
    const { Payment } = sequelize.models;

    // Xác thực chữ ký webhook
    let webhookData;
    try {
        webhookData = await getPayOS().webhooks.verify(body);
    } catch (err) {
        console.error('[PayOS Webhook] Signature verification failed:', err.message);
        return { success: true }; // vẫn trả 200 để PayOS không retry
    }

    const { orderCode, amount, code } = webhookData;
    const isSuccess = code === '00';

    console.log(`[PayOS Webhook] orderCode=${orderCode}, amount=${amount}, code=${code}, success=${isSuccess}`);

    // Tìm giao dịch theo orderCode
    const payment = await Payment.findOne({
        where: { gateway_transaction_id: String(orderCode) }
    });

    if (!payment) {
        console.error(`[PayOS Webhook] Payment not found for orderCode: ${orderCode}`);
        return { success: true };
    }

    // Kiểm tra số tiền (bỏ qua trong chế độ test)
    if (!process.env.PAYOS_TEST_AMOUNT && Number(payment.amount) !== amount) {
        console.error(`[PayOS Webhook] Amount mismatch: expected ${payment.amount}, got ${amount}`);
        return { success: true };
    }

    // Idempotency check
    if (payment.status === 'SUCCESS' || payment.status === 'FAILED') {
        console.log(`[PayOS Webhook] Payment ${orderCode} already ${payment.status}, skipping`);
        return { success: true };
    }

    // Thanh toán thất bại
    if (!isSuccess) {
        await payment.update({
            status: 'FAILED',
            gateway_response: body
        });
        return { success: true };
    }

    // Thanh toán thành công — xử lý business logic
    try {
        await processSuccessPayment(payment, body);
        console.log(`[PayOS Webhook] Payment ${orderCode} processed successfully`);
    } catch (err) {
        console.error('[PayOS Webhook] Processing error:', err);
    }

    return { success: true };
};

module.exports = {
    createBookingPaymentUrlPayOS,
    createInvoicePaymentUrlPayOS,
    payosWebhook
};
