const BuildingService = require('../../../services/building.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Building: { findByPk: jest.fn() },
        Room: { findAll: jest.fn() },
        Contract: { count: jest.fn() },
        Booking: { count: jest.fn() }
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
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));
jest.mock('../../../models/booking.model', () => (require('../../../config/db').sequelize.models.Booking));

const { Building, Room, Contract, Booking } = sequelize.models;

describe('BuildingService - toggleBuildingStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Building.findByPk.mockResolvedValue(null);
        Room.findAll.mockResolvedValue([]);
        Contract.count.mockResolvedValue(0);
        Booking.count.mockResolvedValue(0);
        console.log('\n=========================================================================');
    });

    it('TC_BUILDING_12: Kích hoạt tòa nhà thành công (Happy Path)', async () => {
        const mockBuilding = { 
            id: 1, 
            is_active: false, 
            save: jest.fn().mockResolvedValue(true) 
        };
        Building.findByPk.mockResolvedValue(mockBuilding);

        const result = await BuildingService.toggleBuildingStatus(1, true, { role: 'ADMIN' });

        console.log(`[TEST]: Kích hoạt tòa nhà thành công`);
        expect(result.is_active).toBe(true);
        expect(mockBuilding.save).toHaveBeenCalled();
    });

    it('TC_BUILDING_13: Vô hiệu hóa tòa nhà thành công (Happy Path)', async () => {
        const mockBuilding = { 
            id: 1, 
            is_active: true, 
            save: jest.fn().mockResolvedValue(true) 
        };
        Building.findByPk.mockResolvedValue(mockBuilding);
        Room.findAll.mockResolvedValue([]); // Không có phòng

        const result = await BuildingService.toggleBuildingStatus(1, false, { role: 'ADMIN' });

        console.log(`[TEST]: Vô hiệu hóa tòa nhà thành công`);
        expect(result.is_active).toBe(false);
    });

    it('TC_BUILDING_14: Lỗi khi trạng thái mới trùng với trạng thái hiện tại (400)', async () => {
        const mockBuilding = { id: 1, is_active: true };
        Building.findByPk.mockResolvedValue(mockBuilding);

        console.log(`[TEST]: Trùng trạng thái hiện tại (Active -> Active)`);
        try {
            await BuildingService.toggleBuildingStatus(1, true, { role: 'ADMIN' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toContain('đã ở trạng thái hoạt động');
        }
    });

    it('TC_BUILDING_15: Ngăn chặn vô hiệu hóa nếu có hợp đồng đang hoạt động (409)', async () => {
        const mockBuilding = { id: 1, is_active: true };
        Building.findByPk.mockResolvedValue(mockBuilding);
        Room.findAll.mockResolvedValue([{ id: 101 }]); // Có phòng 101
        Contract.count.mockResolvedValue(2); // Có 2 hợp đồng

        console.log(`[TEST]: Lỗi vô hiệu hóa tòa nhà còn hợp đồng`);
        try {
            await BuildingService.toggleBuildingStatus(1, false, { role: 'ADMIN' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(409);
            expect(error.message).toContain('Hiện có 2 hợp đồng');
        }
    });

    it('TC_BUILDING_16: Lỗi khi không tìm thấy tòa nhà (404)', async () => {
        Building.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Toggle trạng thái tòa nhà không tồn tại`);
        try {
            await BuildingService.toggleBuildingStatus(999, true, { role: 'ADMIN' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy tòa nhà');
        }
    });
});
