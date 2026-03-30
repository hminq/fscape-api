const SettlementService = require('../../../services/settlement.service');
const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

// 1. Mock Audit Service
jest.mock('../../../services/audit.service', () => ({
    log: jest.fn().mockResolvedValue(true)
}));

// 2. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Contract: { findByPk: jest.fn() },
        Settlement: { create: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), findAndCountAll: jest.fn() },
        SettlementItem: { bulkCreate: jest.fn() },
        Request: { findAll: jest.fn(), update: jest.fn() },
        User: { findByPk: jest.fn() },
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

// Mock individual models
jest.mock('../../../models/settlement.model', () => (require('../../../config/db').sequelize.models.Settlement));
jest.mock('../../../models/settlementItem.model', () => (require('../../../config/db').sequelize.models.SettlementItem));
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));
jest.mock('../../../models/request.model', () => (require('../../../config/db').sequelize.models.Request));
jest.mock('../../../models/auditLog.model', () => ({ create: jest.fn() }));

const { Settlement, Request } = sequelize.models;

describe('SettlementService - Workflow & Abnormal Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    describe('createCheckoutSettlement', () => {
        it('TC_SETTLEMENT_01: Tạo quyết toán trả phòng thành công (Happy Path)', async () => {
            const mockContract = { id: 'con-1', customer_id: 1, room_id: 10, deposit_amount: 5000000 };
            const penaltyData = { missingAssets: [], brokenAssets: [], totalPenalty: 0 };
            const mockUser = { id: 5, role: 'STAFF' };

            Request.findAll.mockResolvedValue([]);
            Settlement.create.mockResolvedValue({ 
                id: 'set-1', 
                toJSON: () => ({ id: 'set-1', amount_refund_to_resident: 5000000 }) 
            });

            const result = await SettlementService.createCheckoutSettlement(mockContract, penaltyData, mockUser);
            expect(result.id).toBe('set-1');
            expect(Settlement.create).toHaveBeenCalled();
        });
    });

    describe('closeSettlement', () => {
        it('TC_SETTLEMENT_02: Đóng quyết toán thành công bởi Staff (Happy Path)', async () => {
            const mockSettlement = { id: 'set-1', status: 'FINALIZED', created_by: 5, update: jest.fn() };
            Settlement.findByPk.mockResolvedValue(mockSettlement);

            await SettlementService.closeSettlement('set-1', { id: 5, role: ROLES.STAFF });
            expect(mockSettlement.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'CLOSED' }));
        });

        it('TC_SETTLEMENT_03: Lỗi khi đóng quyết toán của người khác bởi Staff (Abnormal)', async () => {
            const mockSettlement = { id: 'set-1', status: 'FINALIZED', created_by: 99 };
            Settlement.findByPk.mockResolvedValue(mockSettlement);

            console.log(`[TEST]: Đóng quyết toán thất bại - Role STAFF không có quyền`);
            try {
                await SettlementService.closeSettlement('set-1', { id: 5, role: ROLES.STAFF });
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(403);
                expect(error.message).toBe('Bạn chỉ có thể đóng quyết toán do chính bạn tạo');
            }
        });

        it('TC_SETTLEMENT_04: Lỗi đóng quyết toán không tồn tại (Abnormal)', async () => {
            Settlement.findByPk.mockResolvedValue(null);
            console.log(`[TEST]: Đóng quyết toán thất bại - ID không tồn tại`);
            try {
                await SettlementService.closeSettlement('set-999', { id: 1, role: ROLES.ADMIN });
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(404);
                expect(error.message).toContain('Không tìm thấy quyết toán');
            }
        });

        it('TC_SETTLEMENT_05: Lỗi đóng quyết toán đã đóng hoặc đã hủy (Abnormal)', async () => {
            const mockSettlement = { id: 'set-1', status: 'CLOSED', created_by: 1 };
            Settlement.findByPk.mockResolvedValue(mockSettlement);

            console.log(`[TEST]: Đóng quyết toán thất bại - Trạng thái không hợp lệ (CLOSED)`);
            try {
                await SettlementService.closeSettlement('set-1', { id: 1, role: ROLES.ADMIN });
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(400);
                expect(error.message).toContain('Chỉ quyết toán ở trạng thái FINALIZED mới có thể đóng');
            }
        });
    });
});
