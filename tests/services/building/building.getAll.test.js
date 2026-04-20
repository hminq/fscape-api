const BuildingService = require('../../../services/building.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Building: { findAndCountAll: jest.fn() },
        Location: { findByPk: jest.fn() },
        BuildingImage: { bulkCreate: jest.fn() },
        Facility: { findAll: jest.fn() }
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

const { Building } = sequelize.models;

describe('BuildingService - getAllBuildings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Building.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
        console.log('\n=========================================================================');
    });

    it('TC_BUILDING_GET_01: Lấy danh sách tòa nhà thành công (Happy Path - Admin)', async () => {
        const mockRows = [{ id: 1, name: 'Building A', is_active: true, toJSON: () => ({ id: 1, name: 'Building A' }) }];
        Building.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { page: 1, limit: 10 };
        const user = { role: 'ADMIN' };
        const result = await BuildingService.getAllBuildings(query, user);

        console.log(`[TEST]: Lấy danh sách tòa nhà (Admin)`);
        expect(result.total).toBe(1);
        expect(result.data).toHaveLength(1);
    });

    it('TC_BUILDING_GET_02: Tìm kiếm tòa nhà theo tên (Search Filter)', async () => {
        const mockRows = [{ id: 1, name: 'Sunlight Building', toJSON: () => ({ id: 1, name: 'Sunlight Building' }) }];
        Building.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { search: 'Sunlight' };
        const result = await BuildingService.getAllBuildings(query, { role: 'ADMIN' });

        console.log(`[TEST]: Tìm kiếm tòa nhà theo tên`);
        expect(result.data[0].name).toBe('Sunlight Building');
    });

    it('TC_BUILDING_GET_03: Lỗi khi Quản lý truy cập danh sách chung (403)', async () => {
        const user = { role: 'BUILDING_MANAGER' };
        console.log(`[TEST]: Chặn Manager truy cập list chung`);
        try {
            await BuildingService.getAllBuildings({}, user);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(403);
            expect(error.message).toBe('Quản lý và nhân viên phải sử dụng endpoint tòa nhà được phân công');
        }
    });
});
