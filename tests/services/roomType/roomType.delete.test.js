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
            close: jest.fn().mockResolvedValue()
        },
        connectDB: jest.fn().mockResolvedValue()
    };
});

// Mock individual models
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));

const { RoomType, Room } = sequelize.models;

describe('RoomTypeService - deleteRoomType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('TC_ROOMTYPE_04: Xóa loại phòng thành công (Happy Path)', async () => {
        const id = 1;
        const mockRoomType = { id, name: 'Phòng Thường', destroy: jest.fn() };

        RoomType.findByPk.mockResolvedValue(mockRoomType);
        Room.count.mockResolvedValue(0);

        const result = await RoomTypeService.deleteRoomType(id);

        console.log(`[TEST]: Xóa loại phòng hợp lệ`);
        console.log(`- Input   : ID=${id}`);
        console.log(`- Expected: Đã xóa loại phòng "Phòng Thường" thành công`);
        console.log(`- Actual  : ${result.message}`);

        expect(mockRoomType.destroy).toHaveBeenCalled();
        expect(result.message).toBe('Đã xóa loại phòng "Phòng Thường" thành công');
    });

    it('TC_ROOMTYPE_05: Lỗi khi xóa loại phòng không tồn tại (Abnormal)', async () => {
        const id = 999;
        RoomType.findByPk.mockResolvedValue(null);

        console.log(`[TEST]: Xóa ID loại phòng không tồn tại`);
        try {
            await RoomTypeService.deleteRoomType(id);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy loại phòng');
        }
    });

    it('TC_ROOMTYPE_06: Lỗi không thể xóa do có phòng đang sử dụng (Abnormal)', async () => {
        const id = 1;
        const mockRoomType = { id, name: 'Phòng VIP' };
        
        RoomType.findByPk.mockResolvedValue(mockRoomType);
        Room.count.mockResolvedValue(3);

        console.log(`[TEST]: Xóa loại phòng đang được dùng bởi 3 phòng`);
        try {
            await RoomTypeService.deleteRoomType(id);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Không thể xóa loại phòng vì còn 3 phòng đang sử dụng');
        }
    });
});
