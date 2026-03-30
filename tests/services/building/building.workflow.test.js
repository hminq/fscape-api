const BuildingService = require('../../../services/building.service');
const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Building: { count: jest.fn(), create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), findOne: jest.fn() },
        BuildingImage: { bulkCreate: jest.fn(), destroy: jest.fn() },
        BuildingFacility: { bulkCreate: jest.fn(), destroy: jest.fn() },
        Room: { count: jest.fn(), findAll: jest.fn() },
        RoomType: { findAll: jest.fn() },
        Contract: { count: jest.fn() },
        Booking: { count: jest.fn() },
        User: { findByPk: jest.fn(), update: jest.fn(), findAll: jest.fn() },
        Location: { findByPk: jest.fn() },
        University: { findAll: jest.fn() }
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

// Mock individual models to ensure they point to the same mocked model objects
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/user.model', () => (require('../../../config/db').sequelize.models.User));
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));
jest.mock('../../../models/booking.model', () => (require('../../../config/db').sequelize.models.Booking));
jest.mock('../../../models/university.model', () => (require('../../../config/db').sequelize.models.University));
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));

const { Building, Room, User, Contract, Booking, University, RoomType } = sequelize.models;

describe('BuildingService - Unified & Abnormal Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    describe('createBuilding', () => {
        it('TC_BUILDING_01: Tạo tòa nhà thành công (Happy Path)', async () => {
            const mockData = { name: 'FScape Home 1', location_id: 1, address: 'District 1' };
            Building.findOne.mockResolvedValue(null);
            Building.create.mockResolvedValue({ id: 'b1', ...mockData, toJSON: () => ({ id: 'b1', name: 'FScape Home 1' }) });
            
            // For getBuildingById call inside create
            Building.findByPk.mockResolvedValue({ 
                id: 'b1', ...mockData, 
                toJSON: () => ({ id: 'b1', name: 'FScape Home 1', location_id: 1 }) 
            });
            Room.findAll.mockResolvedValue([]);
            University.findAll.mockResolvedValue([]);
            // RoomType.findAll call only happens if uniqueRoomTypeIds.length > 0
            
            const result = await BuildingService.createBuilding(mockData);
            expect(result.id).toBe('b1');
        });

        it('TC_BUILDING_02: Lỗi trùng tên tòa nhà (Abnormal)', async () => {
            Building.findOne.mockResolvedValue({ id: 'b1', name: 'FScape Home 1' });
            console.log(`[TEST]: Tạo tòa nhà thất bại - Trùng tên`);
            try {
                await BuildingService.createBuilding({ name: 'FScape Home 1' });
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(409);
                expect(error.message).toContain('đã tồn tại');
            }
        });

        it('TC_BUILDING_03: Lỗi khi gán quá 20 tiện ích (Abnormal)', async () => {
            const tooManyFacilities = Array(21).fill(1).map((_, i) => i + 1);
            console.log(`[TEST]: Tạo tòa nhà thất bại - Quá nhiều tiện ích`);
            try {
                await BuildingService.createBuilding({ name: 'Building X', facilities: tooManyFacilities });
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(400);
                expect(error.message).toContain('tối đa 20 tiện ích');
            }
        });
    });

    describe('toggleBuildingStatus (Vô hiệu hóa)', () => {
        it('TC_BUILDING_04: Lỗi vô hiệu hóa tòa nhà khi có hợp đồng hoạt động (Abnormal)', async () => {
            const mockBuilding = { id: 'b1', is_active: true };
            Building.findByPk.mockResolvedValue(mockBuilding);
            Room.findAll.mockResolvedValue([{ id: 101 }, { id: 102 }]);
            Contract.count.mockResolvedValue(5); // 5 active contracts

            console.log(`[TEST]: Vô hiệu hóa tòa nhà thất bại - Có hợp đồng hoạt động`);
            try {
                await BuildingService.toggleBuildingStatus('b1', false, { role: ROLES.ADMIN });
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(409);
                expect(error.message).toContain('hợp đồng đang hoạt động');
            }
        });

        it('TC_BUILDING_05: Lỗi vô hiệu hóa tòa nhà khi có đặt phòng (Abnormal)', async () => {
            const mockBuilding = { id: 'b1', is_active: true };
            Building.findByPk.mockResolvedValue(mockBuilding);
            Room.findAll.mockResolvedValue([{ id: 101 }]);
            Contract.count.mockResolvedValue(0);
            Booking.count.mockResolvedValue(3); // 3 pending bookings

            console.log(`[TEST]: Vô hiệu hóa tòa nhà thất bại - Có đặt phòng chờ xử lý`);
            try {
                await BuildingService.toggleBuildingStatus('b1', false, { role: ROLES.ADMIN });
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(409);
                expect(error.message).toContain('đặt phòng đang chờ xử lý');
            }
        });
    });

    describe('deleteBuilding', () => {
        it('TC_BUILDING_06: Lỗi xóa tòa nhà đang có phòng (Abnormal)', async () => {
            const mockBuilding = { id: 'b1', name: 'Building A' };
            Building.findByPk.mockResolvedValue(mockBuilding);
            Room.count.mockResolvedValue(10); // 10 rooms

            console.log(`[TEST]: Xóa tòa nhà thất bại - Đang chứa phòng`);
            try {
                await BuildingService.deleteBuilding('b1');
                throw new Error('Should error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(400);
                expect(error.message).toContain('đang chứa 10 phòng');
            }
        });
    });
});
