const InvoiceService = require('../../../services/invoice.service');
const { sequelize } = require('../../../config/db');
const moment = require('moment');

// 1. Mock Notification Service
jest.mock('../../../services/notification.service', () => ({
    createNotification: jest.fn().mockResolvedValue(true)
}));

// 2. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Contract: { findAll: jest.fn(), findByPk: jest.fn() },
        Invoice: { create: jest.fn(), findAll: jest.fn(), findAndCountAll: jest.fn(), findOne: jest.fn() },
        InvoiceItem: { create: jest.fn() },
        Request: { findAll: jest.fn(), update: jest.fn() },
        Room: { findByPk: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            transaction: jest.fn().mockResolvedValue({ 
                commit: jest.fn(), 
                rollback: jest.fn(),
                LOCK: { UPDATE: 'UPDATE' }
            }),
            authenticate: jest.fn().mockResolvedValue(),
            close: jest.fn().mockResolvedValue()
        },
        connectDB: jest.fn().mockResolvedValue()
    };
});

// Mock individual models to ensure they point to the same mocks
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));
jest.mock('../../../models/invoice.model', () => (require('../../../config/db').sequelize.models.Invoice));
jest.mock('../../../models/invoiceItem.model', () => (require('../../../config/db').sequelize.models.InvoiceItem));
jest.mock('../../../models/request.model', () => (require('../../../config/db').sequelize.models.Request));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));

const { Contract, Invoice, Request } = sequelize.models;

describe('InvoiceService - Periodic Generation & Abnormal Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    describe('generateRentInvoices', () => {
        it('TC_INVOICE_01: Tự động tạo hóa đơn tiền thuê phòng khi đến hạn (Happy Path)', async () => {
            const today = moment().format('YYYY-MM-DD');
            const mockContract = {
                id: 'con-1', contract_number: 'CON001', status: 'ACTIVE',
                next_billing_date: today, billing_cycle: 'CYCLE_1M', base_rent: 5000000,
                customer_id: 1, update: jest.fn().mockResolvedValue(true),
                room: { room_number: '101' }
            };

            Contract.findAll.mockResolvedValue([mockContract]);
            Invoice.create.mockResolvedValue({ id: 'inv-1', invoice_number: 'INV-001' });

            const count = await InvoiceService.generateRentInvoices();
            expect(count).toBe(1);
            expect(Invoice.create).toHaveBeenCalledWith(expect.objectContaining({ invoice_type: 'RENT' }), expect.any(Object));
        });

        it('TC_INVOICE_02: Bỏ qua hợp đồng ALL_IN (Abnormal/Validation)', async () => {
            const today = moment().format('YYYY-MM-DD');
            const mockContract = {
                id: 'con-2', billing_cycle: 'ALL_IN', next_billing_date: today
            };
            Contract.findAll.mockResolvedValue([mockContract]);

            const count = await InvoiceService.generateRentInvoices();
            expect(count).toBe(0);
            expect(Invoice.create).not.toHaveBeenCalled();
        });

        it('TC_INVOICE_04: Lỗi Database khi tạo hóa đơn (Abnormal/Rollback)', async () => {
            const today = moment().format('YYYY-MM-DD');
            const mockContract = {
                id: 'con-3', status: 'ACTIVE', next_billing_date: today, billing_cycle: 'CYCLE_1M',
                base_rent: 5000000, update: jest.fn()
            };
            Contract.findAll.mockResolvedValue([mockContract]);
            Invoice.create.mockRejectedValue(new Error('DB Crash'));

            console.log(`[TEST]: Sinh hóa đơn thất bại - Lỗi Database (Rollback)`);
            const count = await InvoiceService.generateRentInvoices();
            expect(count).toBe(0);
        });
    });

    describe('generateServiceInvoices', () => {
        it('TC_INVOICE_03: Tự động tạo hóa đơn phí dịch vụ (Happy Path)', async () => {
            const mockContract = { id: 'con-1', room_id: 10, customer_id: 1, update: jest.fn() };
            const mockRequest = { id: 'req-1', title: 'Sửa điện', service_price: 200000, status: 'COMPLETED' };

            Contract.findAll.mockResolvedValue([mockContract]);
            Request.findAll.mockResolvedValue([mockRequest]);
            Invoice.create.mockResolvedValue({ id: 'inv-svc-1' });

            const count = await InvoiceService.generateServiceInvoices();
            expect(count).toBe(1);
            expect(Invoice.create).toHaveBeenCalled();
        });
    });
});
