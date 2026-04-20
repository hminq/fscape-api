const LocationService = require('../../../services/location.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Location: { findByPk: jest.fn() },
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

describe('LocationService - getLocationById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Location.findByPk.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_LOCATION_GET_04: Lấy chi tiết địa điểm thành công (Happy Path)', async () => {
        const mockLocation = { id: 1, name: 'Hà Nội' };
        Location.findByPk.mockResolvedValue(mockLocation);

        const result = await LocationService.getLocationById(1);

        console.log(`[TEST]: Lấy chi tiết địa điểm thành công`);
        expect(result.name).toBe('Hà Nội');
        expect(Location.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('TC_LOCATION_GET_05: Lỗi khi ID không tồn tại (404)', async () => {
        Location.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Địa điểm không tồn tại`);
        try {
            await LocationService.getLocationById(999);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy khu vực');
        }
    });

    it('TC_LOCATION_GET_06: Lỗi Database Exception khi truy vấn ID sai định dạng (Abnormal)', async () => {
        const expectedError = 'SequelizeDatabaseError: invalid input syntax for type integer: "abc"';
        Location.findByPk.mockRejectedValue(new Error(expectedError));
        
        console.log(`[TEST]: Truy vấn với ID sai định dạng`);
        try {
            await LocationService.getLocationById('abc');
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
