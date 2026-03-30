const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

// 1. Mock external dependencies (BEFORE everything else)
jest.mock('../../../utils/pdf.util', () => ({
    generateContractPdf: jest.fn().mockResolvedValue('http://secure.url/pdf')
}));

jest.mock('../../../utils/mail.util', () => ({
    sendContractSigningEmail: jest.fn().mockResolvedValue(true),
    sendManagerSigningEmail: jest.fn().mockResolvedValue(true),
    sendRenewalSigningEmail: jest.fn().mockResolvedValue(true)
}));

// 2. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Contract: { count: jest.fn(), create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), findOne: jest.fn() },
        Booking: { findByPk: jest.fn(), findOne: jest.fn() },
        User: { findByPk: jest.fn(), findOne: jest.fn() },
        Room: { findByPk: jest.fn() },
        Building: { findByPk: jest.fn() },
        RoomType: { findByPk: jest.fn() },
        ContractTemplate: { findOne: jest.fn() },
        CustomerProfile: { findOrCreate: jest.fn() },
        AuditLog: { create: jest.fn() }
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

// Mock individual models to return the ones from the mocked sequelize
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));
jest.mock('../../../models/booking.model', () => (require('../../../config/db').sequelize.models.Booking));
jest.mock('../../../models/user.model', () => (require('../../../config/db').sequelize.models.User));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));
jest.mock('../../../models/contractTemplate.model', () => (require('../../../config/db').sequelize.models.ContractTemplate));
jest.mock('../../../models/customerProfile.model', () => (require('../../../config/db').sequelize.models.CustomerProfile));
jest.mock('../../../models/auditLog.model', () => (require('../../../config/db').sequelize.models.AuditLog));

const ContractService = require('../../../services/contract.service');
const { Contract, Booking, User, ContractTemplate } = sequelize.models;

describe('ContractService - Workflow Cases', () => {
    let mockTransaction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransaction = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
        sequelize.transaction.mockResolvedValue(mockTransaction);
        console.log('\n=========================================================================');
    });

    describe('Happy Path', () => {
        it('TC_CONTRACT_01: Tạo hợp đồng từ booking thành công', async () => {
            const mockBooking = {
                id: 'bk-1', status: 'DEPOSIT_PAID', customer_id: 1, check_in_date: '2023-12-01',
                duration_months: 6, billing_cycle: 'CYCLE_1M', deposit_amount: 5000000,
                room: { 
                    id: 10, room_number: '101',
                    building: { id: 20, name: 'Building A', address: '123 ABC' }, 
                    room_type: { name: 'VIP', base_price: 5000000 } 
                },
                update: jest.fn().mockResolvedValue(true)
            };
            Booking.findByPk.mockResolvedValue(mockBooking);
            User.findByPk.mockResolvedValue({ 
                id: 1, first_name: 'A', last_name: 'Nguyen', email: 'a@test.com',
                profile: { gender: 'Male' } 
            });
            User.findOne.mockResolvedValue({ id: 5, first_name: 'M', last_name: 'Manager', email: 'm@test.com' });
            ContractTemplate.findOne.mockResolvedValue({ id: 1, content: 'Hợp đồng số {{contract_number}}', is_default: true, is_active: true });
            Contract.count.mockResolvedValue(100);
            Contract.create.mockResolvedValue({ id: 'con-123' });

            const result = await ContractService.createContractFromBooking('bk-1');
            
            console.log(`[TEST]: Tạo hợp đồng từ booking DEPOSIT_PAID`);
            console.log(`- Expected: Status PENDING_CUSTOMER_SIGNATURE`);
            expect(result.id).toBe('con-123');
            expect(Contract.create).toHaveBeenCalledWith(expect.objectContaining({
                status: 'PENDING_CUSTOMER_SIGNATURE'
            }), expect.any(Object));
        });
    });

    describe('Abnormal Cases', () => {
        it('TC_CONTRACT_02: Lỗi booking chưa thanh toán cọc', async () => {
            Booking.findByPk.mockResolvedValue({ id: 'bk-1', status: 'PENDING' });
            console.log(`[TEST]: Tạo hợp đồng khi booking chưa đóng cọc`);
            try {
                await ContractService.createContractFromBooking('bk-1');
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.status).toBe(400);
                expect(error.message).toBe('Đơn đặt phòng chưa ở trạng thái đã đặt cọc');
            }
        });

        it('TC_CONTRACT_06: Lỗi khi không tìm thấy đơn đặt phòng', async () => {
            Booking.findByPk.mockResolvedValue(null);
            console.log(`[TEST]: Tạo hợp đồng với booking ID không tồn tại`);
            try {
                await ContractService.createContractFromBooking('bk-999');
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.status).toBe(404);
                expect(error.message).toBe('Không tìm thấy đơn đặt phòng');
            }
        });

        it('TC_CONTRACT_08: Lỗi khi ký hợp đồng đã quá hạn ký (Customer Sign)', async () => {
            const mockContract = {
                id: 'con-1',
                status: 'PENDING_CUSTOMER_SIGNATURE',
                customer_id: 1,
                signature_expires_at: new Date(Date.now() - 1000) 
            };
            Contract.findByPk.mockResolvedValue(mockContract);
            console.log(`[TEST]: Khách ký khi hợp đồng đã hết hạn ký`);
            try {
                await ContractService.customerSign('con-1', 'sig-url', { id: 1 });
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.status).toBe(400);
                expect(error.message).toBe('Thời hạn ký đã hết');
            }
        });

        it('TC_CONTRACT_09: Lỗi manager ký sai tòa nhà quản lý', async () => {
            const mockContract = {
                id: 'con-1',
                status: 'PENDING_MANAGER_SIGNATURE',
                room: { building: { id: 2 } }
            };
            Contract.findByPk.mockResolvedValue(mockContract);
            console.log(`[TEST]: Manager ký hợp đồng ở tòa nhà không thuộc quyền quản lý`);
            try {
                await ContractService.managerSign('con-1', 'sig-url', { building_id: 1 });
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.status).toBe(403);
                expect(error.message).toBe('Bạn không có quyền ký hợp đồng này');
            }
        });
    });
});
