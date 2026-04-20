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
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));
jest.mock('../../../models/university.model', () => (require('../../../config/db').sequelize.models.University));

const { Location, Building, University } = sequelize.models;

describe('LocationService - deleteLocation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Location.findByPk.mockResolvedValue(null);
        Building.count.mockResolvedValue(0);
        University.count.mockResolvedValue(0);
        console.log('\n=========================================================================');
    });

    it('TC_LOCATION_08: Xóa địa điểm thành công (Happy Path)', async () => {
        const mockLocation = { 
            id: 1, 
            name: 'Hà Nội', 
            destroy: jest.fn().mockResolvedValue(true) 
        };
        Location.findByPk.mockResolvedValue(mockLocation);

        const result = await LocationService.deleteLocation(1);

        console.log(`[TEST]: Xóa địa điểm thành công`);
        expect(result.message).toContain('thành công');
        expect(mockLocation.destroy).toHaveBeenCalled();
    });

    it('TC_LOCATION_09: Lỗi khi địa điểm không tồn tại (404)', async () => {
        Location.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Xóa địa điểm không tồn tại`);
        try {
            await LocationService.deleteLocation(999);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy khu vực');
        }
    });

    it('TC_LOCATION_10: Lỗi không thể xóa do có dữ liệu liên kết (400)', async () => {
        const mockLocation = { id: 1, name: 'Hà Nội' };
        Location.findByPk.mockResolvedValue(mockLocation);
        Building.count.mockResolvedValue(1); 
        University.count.mockResolvedValue(0);

        console.log(`[TEST]: Lỗi xóa do có tòa nhà liên kết`);
        try {
            await LocationService.deleteLocation(1);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toContain('Vẫn còn dữ liệu liên kết');
        }
    });
});
