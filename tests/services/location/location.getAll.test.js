const LocationService = require('../../../services/location.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Location: { findAndCountAll: jest.fn() },
            Building: { count: jest.fn() },
            University: { count: jest.fn() }
        },
        authenticate: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

// 2. Mock individual models
jest.mock('../../../models/location.model', () => (require('../../../config/db').sequelize.models.Location));

const { Location } = sequelize.models;

describe('LocationService - getAllLocations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Location.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
        console.log('\n=========================================================================');
    });

    it('TC_LOCATION_GET_01: Lấy danh sách địa điểm thành công (Happy Path)', async () => {
        const mockRows = [{ id: 1, name: 'Quận 1' }];
        Location.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { page: 1, limit: 10 };
        const result = await LocationService.getAllLocations(query);

        console.log(`[TEST]: Lấy danh sách địa điểm thành công`);
        expect(result.total).toBe(1);
        expect(result.data).toHaveLength(1);
        expect(Location.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            limit: 10,
            offset: 0
        }));
    });

    it('TC_LOCATION_GET_02: Lỗi DB khi offset âm (Abnormal)', async () => {
        const query = { page: -1, limit: 10 };
        const expectedError = 'SQL Error: OFFSET must not be negative';
        Location.findAndCountAll.mockRejectedValue(new Error(expectedError));

        console.log(`[TEST]: Lỗi tham số phân trang âm`);
        try {
            await LocationService.getAllLocations(query);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('TC_LOCATION_GET_03: Tìm kiếm địa điểm theo tên (Search filter)', async () => {
        const mockRows = [{ id: 1, name: 'Quận 7' }];
        Location.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { search: 'Quận 7' };
        const result = await LocationService.getAllLocations(query);

        console.log(`[TEST]: Tìm kiếm địa điểm theo tên`);
        expect(result.data[0].name).toBe('Quận 7');
        expect(Location.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                name: expect.any(Object)
            })
        }));
    });
});
