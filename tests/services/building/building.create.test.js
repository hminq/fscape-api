const BuildingService = require('../../../services/building.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Building: { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn() },
        Location: { findByPk: jest.fn() },
        BuildingImage: { bulkCreate: jest.fn(), destroy: jest.fn() },
        Facility: { findAll: jest.fn() },
        BuildingFacility: { bulkCreate: jest.fn(), destroy: jest.fn() },
        University: { findAll: jest.fn() },
        Room: { findAll: jest.fn(), count: jest.fn() },
        RoomType: { findAll: jest.fn() },
        User: { findByPk: jest.fn(), update: jest.fn() },
        Contract: { count: jest.fn() },
        Booking: { count: jest.fn() }
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
jest.mock('../../../models/user.model', () => (require('../../../config/db').sequelize.models.User));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/university.model', () => (require('../../../config/db').sequelize.models.University));
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));

const { Building, User, Room, University, RoomType } = sequelize.models;

describe('BuildingService - createBuilding', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định cho các Model
        Building.findOne.mockResolvedValue(null);
        Building.create.mockResolvedValue({ id: 1 });
        User.findByPk.mockResolvedValue(null);
        Room.findAll.mockResolvedValue([]);
        University.findAll.mockResolvedValue([]);
        RoomType.findAll.mockResolvedValue([]);
        
        console.log('\n=========================================================================');
    });

    it('TC_BUILDING_01: Tạo tòa nhà thành công (Happy Path)', async () => {
        const newData = { name: 'Happy House', location_id: 1, total_floors: 5 };
        const mockCreated = { id: 1, toJSON: () => ({ id: 1, ...newData }) };
        Building.create.mockResolvedValue(mockCreated);
        Building.findByPk.mockResolvedValue(mockCreated);

        const result = await BuildingService.createBuilding(newData);

        console.log(`[TEST]: Tạo tòa nhà mới thành công`);
        expect(result.name).toBe('Happy House');
        expect(Building.create).toHaveBeenCalled();
    });

    it('TC_BUILDING_02: Lỗi khi số tầng không hợp lệ (Abnormal)', async () => {
        const newData = { name: 'High Tower', total_floors: 150 };
        console.log(`[TEST]: Tạo tòa nhà với số tầng quá lớn (>99)`);
        try {
            await BuildingService.createBuilding(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toBe('Số tầng phải từ 1 đến 99');
        }
    });

    it('TC_BUILDING_03: Lỗi khi trùng tên tòa nhà (Abnormal)', async () => {
        const newData = { name: 'Existing Building' };
        Building.findOne.mockResolvedValue({ id: 5, name: 'Existing Building' });

        console.log(`[TEST]: Trùng tên tòa nhà`);
        try {
            await BuildingService.createBuilding(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(409);
            expect(error.message).toContain('đã tồn tại');
        }
    });

    it('TC_BUILDING_04: Lỗi khi gán quản lý không hợp lệ (Abnormal)', async () => {
        const newData = { name: 'New Building', manager_id: 10 };
        User.findByPk.mockResolvedValue({ id: 10, role: 'RESIDENT' }); // Không phải Manager

        console.log(`[TEST]: Gán quản lý sai role`);
        try {
            await BuildingService.createBuilding(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toContain('không phải quản lý tòa nhà');
        }
    });
});
