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

// 1. Mock Database & Models (Cấu trúc bắt buộc để service lấy được models)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Booking: { findOne: jest.fn() },
        Payment: { create: jest.fn(), findOne: jest.fn() },
        Invoice: { findOne: jest.fn(), findByPk: jest.fn() },
        Contract: { findByPk: jest.fn() },
        User: { findByPk: jest.fn() },
        Room: { findByPk: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            transaction: jest.fn().mockResolvedValue({ 
                commit: jest.fn(), 
                rollback: jest.fn() 
            }),
            authenticate: jest.fn().mockResolvedValue(),
            close: jest.fn().mockResolvedValue()
        },
        connectDB: jest.fn().mockResolvedValue()
    };
});

// 2. Mock individual models (Để service require trực tiếp không bị lỗi)
jest.mock('../../../models/booking.model', () => (require('../../../config/db').sequelize.models.Booking));
jest.mock('../../../models/payment.model', () => (require('../../../config/db').sequelize.models.Payment));
jest.mock('../../../models/invoice.model', () => (require('../../../config/db').sequelize.models.Invoice));
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));
jest.mock('../../../models/user.model', () => (require('../../../config/db').sequelize.models.User));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));

const { Booking, Payment, Invoice, Contract } = sequelize.models;

describe('PaymentService - createBookingPaymentUrl', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Booking.findOne.mockResolvedValue(null);
        Payment.create.mockResolvedValue(null);
        Payment.findOne.mockResolvedValue(null);
        Invoice.findOne.mockResolvedValue(null);
        
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
            expect(error.message).toBe('Không tìm thấy đơn đặt phòng hợp lệ hoặc đơn đã được xử lý');
        }
    });

    it('TC_PAYMENT_03: Tạo link thanh toán VNPay cho Hóa đơn (Invoice) thành công', async () => {
        const mockInvoice = { 
            id: 'inv-1', 
            invoice_number: 'INV123', 
            total_amount: 3000000,
            invoice_type: 'RENT',
            contract_id: 'con-1'
        };
        const mockPayment = { id: 'pay-2', update: jest.fn().mockResolvedValue(true) };

        Invoice.findOne.mockResolvedValue(mockInvoice);
        Payment.create.mockResolvedValue(mockPayment);

        const result = await PaymentService.createInvoicePaymentUrl(1, 'inv-1', '127.0.0.1');

        console.log(`[TEST]: Tạo URL VNPay cho Hóa đơn`);
        expect(result.paymentUrl).toBe('http://vnpay.vn/pay');
        expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({ 
            invoice_id: 'inv-1',
            payment_type: 'RENT'
        }));
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

    it('TC_PAYMENT_06: Lỗi hệ thống khi cập nhật Booking - Kiểm tra Rollback (Abnormal)', async () => {
        const query = { vnp_TxnRef: 'PAY-1', vnp_Amount: '500000000', vnp_ResponseCode: '00' };
        const mockPayment = { 
            id: 'pay-1', amount: 5000000, status: 'PENDING', payment_type: 'DEPOSIT',
            update: jest.fn().mockResolvedValue(true)
        };
        const mockBooking = { 
            id: 'bk-1', 
            update: jest.fn().mockRejectedValue(new Error('System crash during booking update')) 
        };

        Payment.findOne.mockResolvedValue(mockPayment);
        Booking.findOne.mockResolvedValue(mockBooking);

        const mockTransaction = await sequelize.transaction();

        console.log(`[TEST]: Lỗi hệ thống khi xử lý IPN - Rollback check`);
        const result = await PaymentService.vnpayIpn(query);

        expect(result.RspCode).toBe('99');
        expect(mockTransaction.rollback).toHaveBeenCalled();
    });
});
