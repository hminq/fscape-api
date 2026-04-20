const BuildingService = require('../../../services/building.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Building: { findByPk: jest.fn() },
        Room: { count: jest.fn() },
        User: { update: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            authenticate: jest.fn().mockResolvedValue(),
            close: jest.fn().mockResolvedValue()
        },
        connectDB: jest.fn().mockResolvedValue()
    };
});

// 2. Mock individual models
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/user.model', () => (require('../../../config/db').sequelize.models.User));

const { Building, Room, User } = sequelize.models;

describe('BuildingService - deleteBuilding', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Building.findByPk.mockResolvedValue(null);
        Room.count.mockResolvedValue(0);
        User.update.mockResolvedValue([1]); // success
        console.log('\n=========================================================================');
    });

    it('TC_BUILDING_09: Xóa tòa nhà thành công (Happy Path)', async () => {
        const mockBuilding = { 
            id: 1, 
            name: 'Building A', 
            destroy: jest.fn().mockResolvedValue(true) 
        };
        Building.findByPk.mockResolvedValue(mockBuilding);
        Room.count.mockResolvedValue(0);

        const result = await BuildingService.deleteBuilding(1);

        console.log(`[TEST]: Xóa tòa nhà thành công`);
        expect(result.message).toContain('thành công');
        expect(mockBuilding.destroy).toHaveBeenCalled();
        expect(User.update).toHaveBeenCalledWith({ building_id: null }, { where: { building_id: 1 } });
    });

    it('TC_BUILDING_10: Lỗi không thể xóa vì có phòng liên kết (400)', async () => {
        const mockBuilding = { id: 1, name: 'Building A' };
        Building.findByPk.mockResolvedValue(mockBuilding);
        Room.count.mockResolvedValue(5);

        console.log(`[TEST]: Lỗi xóa tòa nhà chứa phòng`);
        try {
            await BuildingService.deleteBuilding(1);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toContain('đang chứa 5 phòng');
        }
    });

    it('TC_BUILDING_11: Lỗi khi không tìm thấy tòa nhà để xóa (404)', async () => {
        Building.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Xóa tòa nhà không tồn tại`);
        try {
            await BuildingService.deleteBuilding(999);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy tòa nhà');
        }
    });
});
