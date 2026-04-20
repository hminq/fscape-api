const BuildingService = require('../../../services/building.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Building: { count: jest.fn(), create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), findOne: jest.fn(), findAll: jest.fn() },
        BuildingImage: { bulkCreate: jest.fn(), destroy: jest.fn() },
        BuildingFacility: { bulkCreate: jest.fn(), destroy: jest.fn() },
        Room: { findAll: jest.fn(), count: jest.fn() },
        University: { findAll: jest.fn() },
        RoomType: { findAll: jest.fn() },
        User: { findByPk: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            fn: jest.fn(),
            col: jest.fn(),
            where: jest.fn(),
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

// 2. Mock individual models
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));
jest.mock('../../../models/university.model', () => (require('../../../config/db').sequelize.models.University));

const { Building, Room, RoomType, University } = sequelize.models;

describe('BuildingService - updateBuilding', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Building.findByPk.mockResolvedValue(null);
        Building.findOne.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_BUILDING_05: Cập nhật tòa nhà thành công (Happy Path)', async () => {
        const mockBuilding = { 
            id: 1, 
            name: 'Old Name', 
            update: jest.fn().mockResolvedValue(true),
            toJSON: () => ({ id: 1, name: 'New Name' })
        };
        Building.findByPk.mockResolvedValue(mockBuilding);
        // Mock all dependencies for getBuildingById
        Room.findAll.mockResolvedValue([]);
        RoomType.findAll.mockResolvedValue([]);
        University.findAll.mockResolvedValue([]);

        const updateData = { name: 'New Name' };
        const result = await BuildingService.updateBuilding(1, updateData);

        console.log(`[TEST]: Cập nhật tòa nhà thành công`);
        expect(result.name).toBe('New Name');
    });

    it('TC_BUILDING_06: Lỗi khi số tầng cập nhật không hợp lệ (Abnormal)', async () => {
        console.log(`[TEST]: Cập nhật số tầng không hợp lệ (0 tầng)`);
        try {
            await BuildingService.updateBuilding(1, { total_floors: 0 });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toBe('Số tầng phải từ 1 đến 99');
        }
    });

    it('TC_BUILDING_07: Lỗi khi cập nhật trùng tên với tòa nhà khác (409)', async () => {
        const mockBuilding = { id: 1, name: 'Building A' };
        Building.findByPk.mockResolvedValue(mockBuilding);
        Building.findOne.mockResolvedValue({ id: 2, name: 'Building B' });

        console.log(`[TEST]: Cập nhật trùng tên tòa nhà khác`);
        try {
            await BuildingService.updateBuilding(1, { name: 'Building B' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(409);
            expect(error.message).toBe('Tên tòa nhà đã tồn tại');
        }
    });

    it('TC_BUILDING_08: Lỗi khi không tìm thấy tòa nhà để cập nhật (404)', async () => {
        Building.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Cập nhật tòa nhà không tồn tại`);
        try {
            await BuildingService.updateBuilding(999, { name: 'Any' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy tòa nhà');
        }
    });
});
