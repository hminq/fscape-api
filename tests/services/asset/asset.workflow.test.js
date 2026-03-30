const AssetService = require('../../../services/asset.service');
const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Asset: { count: jest.fn(), create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), findOne: jest.fn() },
        AssetHistory: { create: jest.fn() },
        Building: { findByPk: jest.fn() },
        Room: { findByPk: jest.fn() },
        Request: { findOne: jest.fn() },
        AssetType: { findByPk: jest.fn() }
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
jest.mock('../../../models/asset.model', () => (require('../../../config/db').sequelize.models.Asset));
jest.mock('../../../models/assetHistory.model', () => (require('../../../config/db').sequelize.models.AssetHistory));
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/request.model', () => (require('../../../config/db').sequelize.models.Request));
jest.mock('../../../models/assetType.model', () => (require('../../../config/db').sequelize.models.AssetType));

const { Asset, Building, Room, Request, AssetHistory } = sequelize.models;

describe('AssetService - Unified & Abnormal Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    describe('createAsset', () => {
        it('TC_ASSET_01: Tạo tài sản thành công (Happy Path)', async () => {
            const mockData = { name: 'Tủ lạnh', building_id: 1, status: 'AVAILABLE' };
            Building.findByPk.mockResolvedValue({ id: 1, name: 'Building A' });
            Asset.create.mockResolvedValue({ id: 'a1', ...mockData });
            // Mock getAssetById call at the end of createAsset
            Asset.findByPk.mockResolvedValue({ id: 'a1', ...mockData });

            const result = await AssetService.createAsset(mockData);
            expect(result.id).toBe('a1');
            expect(AssetHistory.create).toHaveBeenCalled();
        });

        it('TC_ASSET_02: Lỗi khi tòa nhà không tồn tại (Abnormal)', async () => {
            Building.findByPk.mockResolvedValue(null);
            console.log(`[TEST]: Tạo tài sản thất bại - Tòa nhà không tồn tại`);
            try {
                await AssetService.createAsset({ building_id: 999 });
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(404);
                expect(error.message).toBe('Không tìm thấy tòa nhà');
            }
        });
    });

    describe('assignAsset', () => {
        it('TC_ASSET_03: Gán tài sản vào phòng thành công (Happy Path)', async () => {
            const mockAsset = { id: 'a1', building_id: 1, status: 'AVAILABLE', update: jest.fn() };
            Asset.findByPk.mockResolvedValue(mockAsset);
            Room.findByPk.mockResolvedValue({ id: 10, building_id: 1 });
            
            await AssetService.assignAsset('a1', { room_id: 10 }, { id: 1, role: ROLES.ADMIN });
            expect(mockAsset.update).toHaveBeenCalledWith(expect.objectContaining({ current_room_id: 10, status: 'IN_USE' }), expect.any(Object));
        });

        it('TC_ASSET_04: Lỗi gán tài sản đang bảo trì (Abnormal)', async () => {
            const mockAsset = { id: 'a1', status: 'MAINTENANCE', building_id: 1 };
            Asset.findByPk.mockResolvedValue(mockAsset);
            console.log(`[TEST]: Gán tài sản thất bại - Đang bảo trì`);
            try {
                await AssetService.assignAsset('a1', { room_id: 10 }, { id: 1, role: ROLES.ADMIN, building_id: 1 });
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(409);
                expect(error.message).toBe('Không thể gán tài sản đang bảo trì');
            }
        });

        it('TC_ASSET_05: Lỗi gán phòng khác tòa nhà (Abnormal)', async () => {
            const mockAsset = { id: 'a1', building_id: 1, status: 'AVAILABLE' };
            Asset.findByPk.mockResolvedValue(mockAsset);
            Room.findByPk.mockResolvedValue({ id: 20, building_id: 2 }); // Other building
            console.log(`[TEST]: Gán tài sản thất bại - Khác tòa nhà`);
            try {
                await AssetService.assignAsset('a1', { room_id: 20 }, { id: 1, role: ROLES.ADMIN });
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(400);
                expect(error.message).toContain('không cùng tòa nhà');
            }
        });
    });

    describe('deleteAsset', () => {
        it('TC_ASSET_06: Lỗi xóa tài sản đang sử dụng (Abnormal)', async () => {
            const mockAsset = { id: 'a1', status: 'IN_USE' };
            Asset.findByPk.mockResolvedValue(mockAsset);
            console.log(`[TEST]: Xóa tài sản thất bại - Đang sử dụng`);
            try {
                await AssetService.deleteAsset('a1');
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(409);
                expect(error.message).toContain('đang sử dụng');
            }
        });

        it('TC_ASSET_07: Lỗi xóa tài sản có yêu cầu bảo trì đang hoạt động (Abnormal)', async () => {
            const mockAsset = { id: 'a1', status: 'AVAILABLE' };
            Asset.findByPk.mockResolvedValue(mockAsset);
            Request.findOne.mockResolvedValue({ id: 'req-1', status: 'PENDING' });
            console.log(`[TEST]: Xóa tài sản thất bại - Có request bảo trì`);
            try {
                await AssetService.deleteAsset('a1');
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(409);
                expect(error.message).toContain('yêu cầu bảo trì đang hoạt động');
            }
        });
    });
});
