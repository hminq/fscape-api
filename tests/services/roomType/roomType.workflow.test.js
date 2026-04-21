const RoomTypeService = require('../../../services/roomType.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        RoomType: { count: jest.fn(), create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), findOne: jest.fn() },
        Room: { count: jest.fn() },
        RoomTypeAsset: { findAll: jest.fn(), destroy: jest.fn(), bulkCreate: jest.fn() },
        AssetType: { findAll: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            transaction: jest.fn().mockResolvedValue({ 
                commit: jest.fn(), 
                rollback: jest.fn()
            }),
            authenticate: jest.fn().mockResolvedValue(),
            fn: jest.fn(),
            col: jest.fn(),
            where: jest.fn()
        },
        connectDB: jest.fn().mockResolvedValue()
    };
});

// Mock individual models
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/roomTypeAsset.model', () => (require('../../../config/db').sequelize.models.RoomTypeAsset));
jest.mock('../../../models/assetType.model', () => (require('../../../config/db').sequelize.models.AssetType));

const { RoomType, Room, RoomTypeAsset, AssetType } = sequelize.models;

describe('RoomTypeService - Unified & Abnormal Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định cho các Model
        RoomType.findOne.mockResolvedValue(null);
        RoomType.findByPk.mockResolvedValue(null);
        Room.count.mockResolvedValue(0);
        AssetType.findAll.mockResolvedValue([]);
        
        console.log('\n=========================================================================');
    });

    describe('createRoomType', () => {
        it('TC_ROOMTYPE_01: Tạo loại phòng thành công (Happy Path)', async () => {
            const mockData = { name: 'Phòng Đơn Standard', base_price: 3000000, capacity_max: 2 };
            RoomType.findOne.mockResolvedValue(null);
            RoomType.create.mockResolvedValue({ id: 'rt1', ...mockData });

            const result = await RoomTypeService.createRoomType(mockData);
            expect(result.id).toBe('rt1');
        });

        it('TC_ROOMTYPE_02: Lỗi trùng tên loại phòng (Abnormal)', async () => {
            RoomType.findOne.mockResolvedValue({ id: 'rt1', name: 'Phòng Đơn' });
            console.log(`[TEST]: Tạo loại phòng thất bại - Trùng tên`);
            try {
                await RoomTypeService.createRoomType({ name: 'Phòng Đơn' });
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(409);
                expect(error.message).toContain('đã tồn tại');
            }
        });

        it('TC_ROOMTYPE_03: Lỗi sức chứa tối thiểu > tối đa (Abnormal)', async () => {
            console.log(`[TEST]: Tạo loại phòng thất bại - Sai sức chứa (min > max)`);
            try {
                await RoomTypeService.createRoomType({ name: 'Phòng X', capacity_min: 5, capacity_max: 2 });
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(400);
                expect(error.message).toContain('nhỏ hơn hoặc bằng');
            }
        });
    });

    describe('deleteRoomType', () => {
        it('TC_ROOMTYPE_04: Lỗi xóa loại phòng đang được sử dụng (Abnormal)', async () => {
            const mockRoomType = { id: 'rt1', name: 'Standard' };
            RoomType.findByPk.mockResolvedValue(mockRoomType);
            Room.count.mockResolvedValue(15); // 15 rooms using this type

            console.log(`[TEST]: Xóa loại phòng thất bại - Đang được sử dụng`);
            try {
                await RoomTypeService.deleteRoomType('rt1');
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(409);
                expect(error.message).toContain('15 phòng đang sử dụng');
            }
        });
    });

    describe('replaceTemplateAssets', () => {
        it('TC_ROOMTYPE_05: Lỗi gán quá 20 loại tài sản mẫu (Abnormal)', async () => {
            const mockRoomType = { id: 'rt1' };
            RoomType.findByPk.mockResolvedValue(mockRoomType);
            const tooManyAssets = Array(21).fill(1).map((_, i) => ({ asset_type_id: i + 1, quantity: 1 }));

            console.log(`[TEST]: Gán tài sản mẫu thất bại - Vượt quá 20 loại`);
            try {
                await RoomTypeService.replaceTemplateAssets('rt1', tooManyAssets);
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(400);
                expect(error.message).toContain('Tối đa chỉ được gán 20 loại tài sản');
            }
        });

        it('TC_ROOMTYPE_06: Lỗi gán tài sản mẫu không tồn tại (Abnormal)', async () => {
            const mockRoomType = { id: 'rt1' };
            RoomType.findByPk.mockResolvedValue(mockRoomType);
            AssetType.findAll.mockResolvedValue([{ id: 1 }]); // Only 1 exists

            console.log(`[TEST]: Gán tài sản mẫu thất bại - AssetType không tồn tại`);
            try {
                await RoomTypeService.replaceTemplateAssets('rt1', [{ asset_type_id: 1 }, { asset_type_id: 999 }]);
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(400);
                expect(error.message).toContain('không hợp lệ');
            }
        });

        it('TC_ROOMTYPE_07: Lỗi hệ thống khi gán tài sản mẫu - Kiểm tra Rollback (Abnormal)', async () => {
            const mockRoomType = { id: 'rt1' };
            RoomType.findByPk.mockResolvedValue(mockRoomType);
            AssetType.findAll.mockResolvedValue([{ id: 1 }]);
            
            // Giả lập destroy thành công nhưng bulkCreate bị lỗi hệ thống
            RoomTypeAsset.destroy.mockResolvedValue(1);
            RoomTypeAsset.bulkCreate.mockRejectedValue(new Error('Database crash'));

            const { sequelize } = require('../../../config/db');
            const mockTransaction = await sequelize.transaction();

            console.log(`[TEST]: Lỗi hệ thống khi gán tài sản - Rollback check`);
            try {
                await RoomTypeService.replaceTemplateAssets('rt1', [{ asset_type_id: 1, quantity: 5 }]);
                throw new Error('Should have thrown error');
            } catch (error) {
                expect(error.message).toBe('Database crash');
                expect(mockTransaction.rollback).toHaveBeenCalled();
            }
        });

        it('TC_ROOM_TYPE_08: Gán tài sản mẫu thành công (Happy Path)', async () => {
            const mockRoomType = { id: 'rt1', name: 'Standard' };
            RoomType.findByPk.mockResolvedValue(mockRoomType);
            AssetType.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
            
            RoomTypeAsset.destroy.mockResolvedValue(2);
            RoomTypeAsset.bulkCreate.mockResolvedValue([]);

            const result = await RoomTypeService.replaceTemplateAssets('rt1', [
                { asset_type_id: 1, quantity: 2 },
                { asset_type_id: 2, quantity: 1 }
            ]);

            console.log(`[TEST]: Gán tài sản mẫu thành công`);
            expect(result.message).toContain('thành công');
            expect(RoomTypeAsset.destroy).toHaveBeenCalled();
            expect(RoomTypeAsset.bulkCreate).toHaveBeenCalled();
        });
    });
});
