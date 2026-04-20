const LocationService = require('../../../services/location.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Location: { findByPk: jest.fn() }
        },
        authenticate: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

// 2. Mock individual models
jest.mock('../../../models/location.model', () => (require('../../../config/db').sequelize.models.Location));

const { Location } = sequelize.models;

describe('LocationService - toggleLocationStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Location.findByPk.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_LOCATION_11: Kích hoạt địa điểm thành công (Happy Path)', async () => {
        const mockLocation = { 
            id: 1, 
            is_active: false, 
            save: jest.fn().mockResolvedValue(true) 
        };
        Location.findByPk.mockResolvedValue(mockLocation);

        const result = await LocationService.toggleLocationStatus(1, true);

        console.log(`[TEST]: Kích hoạt địa điểm thành công`);
        expect(result.is_active).toBe(true);
        expect(mockLocation.save).toHaveBeenCalled();
    });

    it('TC_LOCATION_12: Vô hiệu hóa địa điểm thành công (Happy Path)', async () => {
        const mockLocation = { 
            id: 1, 
            is_active: true, 
            save: jest.fn().mockResolvedValue(true) 
        };
        Location.findByPk.mockResolvedValue(mockLocation);

        const result = await LocationService.toggleLocationStatus(1, false);

        console.log(`[TEST]: Vô hiệu hóa địa điểm thành công`);
        expect(result.is_active).toBe(false);
        expect(mockLocation.save).toHaveBeenCalled();
    });

    it('TC_LOCATION_13: Lỗi khi trạng thái mới trùng với trạng thái hiện tại (400)', async () => {
        const mockLocation = { id: 1, is_active: true };
        Location.findByPk.mockResolvedValue(mockLocation);
        const expectedError = 'Khu vực đã ở trạng thái hoạt động';

        console.log(`[TEST]: Trùng trạng thái hiện tại (Active -> Active)`);
        try {
            await LocationService.toggleLocationStatus(1, true);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('TC_LOCATION_14: Lỗi khi địa điểm không tồn tại (404)', async () => {
        Location.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Toggle trạng thái địa điểm không tồn tại`);
        try {
            await LocationService.toggleLocationStatus(999, true);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy khu vực');
        }
    });
});
