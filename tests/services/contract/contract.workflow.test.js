const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

// 1. Mock external dependencies
jest.mock('../../../utils/pdf.util', () => ({
    generateContractPdf: jest.fn().mockResolvedValue('http://secure.url/pdf')
}));

jest.mock('../../../utils/mail.util', () => ({
    sendContractSigningEmail: jest.fn().mockResolvedValue(true),
    sendManagerSigningEmail: jest.fn().mockResolvedValue(true),
    sendRenewalSigningEmail: jest.fn().mockResolvedValue(true),
    sendInvoiceCreatedEmail: jest.fn().mockResolvedValue(true),
    sendContractTerminatedEmail: jest.fn().mockResolvedValue(true)
}));

// 2. Mock Database & Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Contract: { count: jest.fn(), create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), findOne: jest.fn(), update: jest.fn() },
        Booking: { findByPk: jest.fn(), findOne: jest.fn() },
        User: { findByPk: jest.fn(), findOne: jest.fn() },
        Room: { findByPk: jest.fn(), findAll: jest.fn() },
        Building: { findByPk: jest.fn() },
        RoomType: { findByPk: jest.fn() },
        ContractTemplate: { findOne: jest.fn() },
        CustomerProfile: { findOrCreate: jest.fn() },
        AuditLog: { create: jest.fn() },
        ContractExtension: { create: jest.fn() },
        Invoice: { create: jest.fn() },
        InvoiceItem: { create: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            options: { logging: false },
            fn: jest.fn(),
            col: jest.fn(),
            where: jest.fn(),
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

// Explicitly mock all model files used by ContractService
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));
jest.mock('../../../models/booking.model', () => (require('../../../config/db').sequelize.models.Booking));
jest.mock('../../../models/user.model', () => (require('../../../config/db').sequelize.models.User));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));
jest.mock('../../../models/contractTemplate.model', () => (require('../../../config/db').sequelize.models.ContractTemplate));
jest.mock('../../../models/customerProfile.model', () => (require('../../../config/db').sequelize.models.CustomerProfile));
jest.mock('../../../models/auditLog.model', () => (require('../../../config/db').sequelize.models.AuditLog));
jest.mock('../../../models/invoice.model', () => (require('../../../config/db').sequelize.models.Invoice));
jest.mock('../../../models/invoiceItem.model', () => (require('../../../config/db').sequelize.models.InvoiceItem));

const ContractService = require('../../../services/contract.service');
const { Contract, Booking, User, ContractTemplate, Room, ContractExtension, Invoice, InvoiceItem } = sequelize.models;

describe('ContractService - Unified Workflow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset defaults to avoid 'undefined' errors
        Contract.findByPk.mockResolvedValue({});
        Booking.findByPk.mockResolvedValue({});
        Booking.findOne.mockResolvedValue({ update: jest.fn() });
        User.findByPk.mockResolvedValue({ id: 1, email: 'test@test.com' });
        User.findOne.mockResolvedValue({ id: 5 });
        ContractTemplate.findOne.mockResolvedValue({ id: 1, content: 'Template' });
        Invoice.create.mockResolvedValue({ id: 'inv-1', invoice_number: 'INV-001' });
        InvoiceItem.create.mockResolvedValue({ id: 'item-1' });
        
        console.log('\n=========================================================================');
    });

    describe('Creation from Booking', () => {
        it('TC_CONTRACT_01: Tạo hợp đồng từ booking thành công (Happy Path)', async () => {
            const mockBooking = {
                id: 'bk-1', status: 'DEPOSIT_PAID', customer_id: 1, check_in_date: '2023-12-01',
                duration_months: 6, billing_cycle: 'CYCLE_1M', deposit_amount: 5000000,
                room: { 
                    id: 10, room_number: '101',
                    building: { id: 20, name: 'Building A', address: '123' }, 
                    room_type: { name: 'VIP', base_price: 5000000 } 
                },
                update: jest.fn().mockResolvedValue(true)
            };
            Booking.findByPk.mockResolvedValue(mockBooking);
            User.findByPk.mockResolvedValue({ id: 1, email: 'a@test.com', profile: {} });
            User.findOne.mockResolvedValue({ id: 5, email: 'm@test.com' });
            ContractTemplate.findOne.mockResolvedValue({ id: 1, content: 'Template {{contract_number}}', is_active: true });
            Contract.create.mockResolvedValue({ id: 'con-1' });

            const result = await ContractService.createContractFromBooking('bk-1');
            expect(result.id).toBe('con-1');
            expect(Contract.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_CUSTOMER_SIGNATURE' }), expect.any(Object));
        });

        it('TC_CONTRACT_02: Lỗi khi booking chưa thanh toán cọc (400)', async () => {
            Booking.findByPk.mockResolvedValue({ id: 'bk-1', status: 'PENDING' });
            try {
                await ContractService.createContractFromBooking('bk-1');
                throw new Error('Should error');
            } catch (error) {
                expect(error.status).toBe(400);
                expect(error.message).toBe('Đơn đặt phòng chưa ở trạng thái đã đặt cọc');
            }
        });
    });

    describe('Signing Workflow', () => {
        it('TC_CONTRACT_03: Khách hàng ký hợp đồng thành công (Happy Path)', async () => {
            const mockContract = {
                id: 'con-1', status: 'PENDING_CUSTOMER_SIGNATURE', customer_id: 1,
                rendered_content: 'Content {{customer_signature}}',
                update: jest.fn().mockResolvedValue(true)
            };
            Contract.findByPk.mockResolvedValue(mockContract);
            User.findByPk.mockResolvedValue({ id: 1, email: 'customer@test.com' }); // for email check

            const result = await ContractService.customerSign('con-1', 'sig-url', { id: 1 });
            expect(mockContract.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'PENDING_MANAGER_SIGNATURE'
            }));
        });

        it('TC_CONTRACT_04: Manager ký hợp đồng thành công (Happy Path)', async () => {
            const mockContract = {
                id: 'con-1', status: 'PENDING_MANAGER_SIGNATURE', start_date: '2023-12-01',
                billing_cycle: 'CYCLE_1M',
                room: { building: { id: 20 } },
                update: jest.fn().mockResolvedValue(true)
            };
            Contract.findByPk.mockResolvedValue(mockContract);
            Booking.findOne.mockResolvedValue({ update: jest.fn() });

            const result = await ContractService.managerSign('con-1', 'sig-url', { building_id: 20 });
            expect(mockContract.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'PENDING_FIRST_PAYMENT'
            }), expect.any(Object));
        });

        it('TC_CONTRACT_05: Lỗi khi Manager ký sai tòa nhà (403)', async () => {
            const mockContract = {
                id: 'con-1', status: 'PENDING_MANAGER_SIGNATURE',
                room: { building: { id: 1 } }
            };
            Contract.findByPk.mockResolvedValue(mockContract);
            try {
                await ContractService.managerSign('con-1', 'sig-url', { building_id: 2 });
                throw new Error('Should error');
            } catch (error) {
                expect(error.status).toBe(403);
                expect(error.message).toBe('Bạn không có quyền ký hợp đồng này');
            }
        });
    });

    describe('Renewal Logic', () => {
        it('TC_CONTRACT_06: Gia hạn hợp đồng thành công (Happy Path)', async () => {
            const oldContract = {
                id: 'con-old', status: 'ACTIVE', customer_id: 1, end_date: '2024-06-01',
                deposit_original_amount: 5000000, billing_cycle: 'CYCLE_1M',
                room: { id: 10, building: { id: 20 }, room_type: { base_price: 5000000 } }
            };
            Contract.findByPk.mockResolvedValue(oldContract);
            User.findByPk.mockResolvedValue({ id: 1, profile: {} });
            User.findOne.mockResolvedValue({ id: 5, email: 'm@test.com' }); // manager
            ContractTemplate.findOne.mockResolvedValue({ id: 1, content: 'Template', is_active: true });

            const result = await ContractService.renewContract('con-old', { duration_months: 6 }, { id: 1, role: ROLES.RESIDENT });
            expect(Contract.create).toHaveBeenCalledWith(expect.objectContaining({
                renewed_from_contract_id: 'con-old',
                status: 'PENDING_CUSTOMER_SIGNATURE'
            }), expect.any(Object));
            expect(ContractExtension.create).toHaveBeenCalled();
        });

        it('TC_CONTRACT_07: Lỗi khi người dùng không phải cưu dân gia hạn (403)', async () => {
            Contract.findByPk.mockResolvedValue({ id: 'con-1', customer_id: 1 });
            try {
                await ContractService.renewContract('con-1', {}, { id: 1, role: ROLES.CUSTOMER });
                throw new Error('Should error');
            } catch (error) {
                expect(error.status).toBe(403);
                expect(error.message).toContain('Chỉ cư dân');
            }
        });
    });

    describe('Queries & Access Control', () => {
        it('TC_CONTRACT_08: Admin lấy được tất cả hợp đồng', async () => {
            Contract.findAndCountAll.mockResolvedValue({ count: 10, rows: [{ id: 'con-1' }] });
            const result = await ContractService.getAllContracts({}, { role: ROLES.ADMIN });
            expect(result.total).toBe(10);
            expect(Contract.findAndCountAll).toHaveBeenCalled();
        });

        it('TC_CONTRACT_09: Manager chỉ lấy được hợp đồng tòa nhà mình (403 if no building)', async () => {
            try {
                await ContractService.getAllContracts({}, { role: ROLES.BUILDING_MANAGER, building_id: null });
                throw new Error('Should error');
            } catch (error) {
                expect(error.status).toBe(403);
                expect(error.message).toContain('chưa được gán tòa nhà');
            }
        });
    });
});
