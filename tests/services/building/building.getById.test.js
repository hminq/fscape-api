const BuildingService = require('../../../services/building.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Building: { findByPk: jest.fn() },
        Location: { findByPk: jest.fn() },
        BuildingImage: { bulkCreate: jest.fn() },
        Facility: { findAll: jest.fn() },
        Room: { findAll: jest.fn() },
        RoomType: { findAll: jest.fn() },
        University: { findAll: jest.fn() },
        User: { findByPk: jest.fn() }
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
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));
jest.mock('../../../models/university.model', () => (require('../../../config/db').sequelize.models.University));

const { Building, Room, RoomType, University } = sequelize.models;

describe('BuildingService - getBuildingById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Building.findByPk.mockResolvedValue(null);
        Room.findAll.mockResolvedValue([]);
        RoomType.findAll.mockResolvedValue([]);
        University.findAll.mockResolvedValue([]);
        console.log('\n=========================================================================');
    });

    it('TC_BUILDING_GET_04: Lấy chi tiết tòa nhà thành công (Happy Path)', async () => {
        const mockBuilding = { 
            id: 1, 
            name: 'Building A', 
            location_id: 1,
            toJSON: () => ({ id: 1, name: 'Building A', location_id: 1 })
        };
        Building.findByPk.mockResolvedValue(mockBuilding);

        const result = await BuildingService.getBuildingById(1, { role: 'ADMIN' });

        console.log(`[TEST]: Lấy chi tiết tòa nhà thành công`);
        expect(result.name).toBe('Building A');
        expect(Room.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { building_id: 1 } }));
    });

    it('TC_BUILDING_GET_05: Lỗi khi không tìm thấy tòa nhà (404)', async () => {
        Building.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Truy vấn tòa nhà không tồn tại`);
        try {
            await BuildingService.getBuildingById(999, { role: 'ADMIN' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy tòa nhà');
        }
    });

    it('TC_BUILDING_GET_06: Lỗi khi Quản lý truy cập tòa nhà sai phân quyền (403)', async () => {
        const user = { role: 'BUILDING_MANAGER', building_id: 10 };
        console.log(`[TEST]: Manager truy cập tòa nhà qua endpoint chung`);
        try {
            await BuildingService.getBuildingById(10, user);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(403);
            expect(error.message).toContain('sử dụng endpoint tòa nhà được phân công');
        }
    });
});
