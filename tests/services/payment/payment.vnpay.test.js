const PaymentService = require('../../../services/payment.service');
const { sequelize } = require('../../../config/db');

// 1. Mock external utility dependencies
jest.mock('../../../utils/vnpay', () => ({
    createPaymentUrl: jest.fn().mockReturnValue('http://vnpay.vn/pay'),
    verifyIpnSignature: jest.fn().mockReturnValue(true)
}));

jest.mock('../../../utils/payos', () => {
    const mockPayOS = {
        paymentRequests: {
            create: jest.fn().mockResolvedValue({ checkoutUrl: 'http://payos.vn/checkout' }),
            verify: jest.fn().mockResolvedValue({ orderCode: 12345, amount: 5000000, code: '00' })
        },
        webhooks: {
            verify: jest.fn().mockResolvedValue({ orderCode: 12345, amount: 5000000, code: '00' })
        }
    };
    return jest.fn(() => mockPayOS);
});

// 2. Mock service dependencies to avoid circular or unintended business logic
jest.mock('../../../services/contract.service', () => ({
    createContractFromBooking: jest.fn().mockResolvedValue({ id: 'con-1' })
}));

// 3. Mock database
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Booking: { findOne: jest.fn() },
            Payment: { create: jest.fn(), findOne: jest.fn() },
            Invoice: { findOne: jest.fn(), findByPk: jest.fn() },
            Contract: { findByPk: jest.fn() },
            User: { findByPk: jest.fn() },
            Room: { findByPk: jest.fn() }
        },
        transaction: jest.fn().mockResolvedValue({ commit: jest.fn(), rollback: jest.fn() }),
        authenticate: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

// 4. Load Models for mocking
const { Booking, Payment, Invoice } = sequelize.models;

describe('PaymentService - createBookingPaymentUrl', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('TC_PAYMENT_01: Tạo link thanh toán VNPay cho Booking thành công', async () => {
        const mockBooking = { 
            id: 'bk-1', 
            booking_number: 'BK123', 
            deposit_amount: 5000000,
            update: jest.fn().mockResolvedValue(true)
        };
        const mockPayment = { id: 'pay-1', update: jest.fn().mockResolvedValue(true) };

        Booking.findOne.mockResolvedValue(mockBooking);
        Payment.create.mockResolvedValue(mockPayment);

        const result = await PaymentService.createBookingPaymentUrl(1, 'bk-1', '127.0.0.1');

        console.log(`[TEST]: Tạo URL VNPay cho Booking`);
        expect(result.paymentUrl).toBe('http://vnpay.vn/pay');
        expect(Payment.create).toHaveBeenCalled();
        expect(mockBooking.update).toHaveBeenCalledWith(expect.objectContaining({ deposit_payment_id: 'pay-1' }));
    });

    it('TC_PAYMENT_02: Lỗi khi booking không tồn tại hoặc đã xử lý', async () => {
        Booking.findOne.mockResolvedValue(null);

        console.log(`[TEST]: Tạo URL VNPay thất bại - Booking không hợp lệ`);
        try {
            await PaymentService.createBookingPaymentUrl(1, 'invalid', '127.0.0.1');
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error: "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy đơn đặt phòng hợp lệ hoặc đơn đã được xử lý');
        }
    });
});

describe('PaymentService - vnpayIpn', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('TC_PAYMENT_03: Xử lý VNPay IPN thành công (DEPOSIT)', async () => {
        const query = { vnp_TxnRef: 'PAY-1', vnp_Amount: '500000000', vnp_ResponseCode: '00' };
        const mockPayment = { 
            id: 'pay-1', 
            amount: 5000000, 
            status: 'PENDING', 
            payment_type: 'DEPOSIT',
            update: jest.fn().mockResolvedValue(true)
        };
        const mockBooking = { id: 'bk-1', update: jest.fn().mockResolvedValue(true) };

        Payment.findOne.mockResolvedValue(mockPayment);
        Booking.findOne.mockResolvedValue(mockBooking);

        const result = await PaymentService.vnpayIpn(query);

        console.log(`[TEST]: Xử lý VNPay IPN (Đặt cọc)`);
        expect(result.RspCode).toBe('00');
        expect(mockPayment.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'SUCCESS' }), expect.any(Object));
        expect(mockBooking.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'DEPOSIT_PAID' }), expect.any(Object));
    });

    it('TC_PAYMENT_04: Lỗi VNPay IPN - Sai chữ ký', async () => {
        const { verifyIpnSignature } = require('../../../utils/vnpay');
        verifyIpnSignature.mockReturnValueOnce(false);

        const result = await PaymentService.vnpayIpn({});

        console.log(`[TEST]: Xử lý VNPay IPN thất bại - Sai chữ ký`);
        expect(result.RspCode).toBe('97');
    });
});
