const RoomTypeService = require('../../../services/roomType.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        RoomType: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), count: jest.fn(), findAndCountAll: jest.fn() },
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
            close: jest.fn().mockResolvedValue(),
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

const { RoomType } = sequelize.models;

describe('RoomTypeService - updateRoomType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        RoomType.findOne.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_ROOM_TYPE_01: Cập nhật loại phòng thành công (Happy Path)', async () => {
        const id = 1;
        const updateData = { name: 'Phòng Mới VIP', base_price: 2500000 };
        const mockRoomType = { 
            id, 
            name: 'Phòng Cũ', 
            capacity_min: 1, 
            capacity_max: 2, 
            update: jest.fn().mockImplementation(function(data) {
                Object.assign(this, data);
                return Promise.resolve(this);
            }) 
        };

        RoomType.findByPk.mockResolvedValue(mockRoomType);

        const result = await RoomTypeService.updateRoomType(id, updateData);

        console.log(`[TEST]: Cập nhật thông tin loại phòng hợp lệ`);
        expect(mockRoomType.update).toHaveBeenCalledWith(updateData);
        expect(result.name).toBe('Phòng Mới VIP');
    });

    it('TC_ROOM_TYPE_02: Lỗi cập nhật loại phòng không tồn tại (Abnormal)', async () => {
        const id = 999;
        RoomType.findByPk.mockResolvedValue(null);

        console.log(`[TEST]: Cập nhật ID loại phòng không tồn tại`);
        try {
            await RoomTypeService.updateRoomType(id, {});
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy loại phòng');
        }
    });

    it('TC_ROOM_TYPE_03: Lỗi cập nhật trùng tên với loại khác (Abnormal)', async () => {
        const id = 1;
        const mockRoomType = { id, name: 'Phòng Thường' };
        RoomType.findByPk.mockResolvedValue(mockRoomType);
        RoomType.findOne.mockResolvedValue({ id: 2, name: 'Phòng VIP Mới' });

        console.log(`[TEST]: Cập nhật đổi tên sang tên đã tồn tại`);
        try {
            await RoomTypeService.updateRoomType(id, { name: 'Phòng VIP Mới' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toContain('đã tồn tại');
        }
    });

    it('TC_ROOM_TYPE_04: Ngăn chặn thay đổi tiền cọc (FScape Business Rule)', async () => {
        const id = 1;
        const mockRoomType = { id, name: 'Phòng VIP', capacity_min: 1, capacity_max: 2, update: jest.fn() };
        RoomType.findByPk.mockResolvedValue(mockRoomType);

        await RoomTypeService.updateRoomType(id, { deposit_months: 5, base_price: 50 });

        console.log(`[TEST]: Gửi lên deposit_months=5 sẽ bị xóa khỏi data update`);
        expect(mockRoomType.update).toHaveBeenCalledWith(expect.objectContaining({
            base_price: 50
        }));
        
        // Ensure deposit_months was NOT passed to the update call
        const updateCall = mockRoomType.update.mock.calls[0][0];
        expect(updateCall.deposit_months).toBeUndefined();
    });

    it('TC_ROOM_TYPE_05: Lỗi sức chứa tối thiểu vượt quá tối đa hiện tại (Abnormal)', async () => {
        const id = 1;
        // Room hiện tại có min=2, max=4
        const mockRoomType = { id, capacity_min: 2, capacity_max: 4, update: jest.fn() };
        RoomType.findByPk.mockResolvedValue(mockRoomType);

        console.log(`[TEST]: Cập nhật min_capacity=5 nhưng max_capacity=4`);
        try {
            await RoomTypeService.updateRoomType(id, { capacity_min: 5 });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Sức chứa tối thiểu phải nhỏ hơn hoặc bằng sức chứa tối đa');
        }
    });
});
