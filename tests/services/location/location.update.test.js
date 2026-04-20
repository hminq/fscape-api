const LocationService = require('../../../services/location.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Location: { findByPk: jest.fn(), findOne: jest.fn() },
            Building: { count: jest.fn() },
            University: { count: jest.fn() }
        },
        fn: jest.fn(),
        col: jest.fn(),
        where: jest.fn(),
        authenticate: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

// 2. Mock individual models
jest.mock('../../../models/location.model', () => (require('../../../config/db').sequelize.models.Location));

const { Location } = sequelize.models;

describe('LocationService - updateLocation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Location.findByPk.mockResolvedValue(null);
        Location.findOne.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_LOCATION_04: Cập nhật địa điểm thành công (Happy Path)', async () => {
        const mockLocation = { 
            id: 1, 
            name: 'Hà Nội', 
            update: jest.fn().mockImplementation(function(data) {
                return Promise.resolve({ ...this, ...data });
            }) 
        };
        Location.findByPk.mockResolvedValue(mockLocation);

        const updateData = { name: 'Hà Nội Mới' };
        const result = await LocationService.updateLocation(1, updateData);

        console.log(`[TEST]: Cập nhật địa điểm thành công`);
        expect(result.name).toBe('Hà Nội Mới');
        expect(mockLocation.update).toHaveBeenCalled();
    });

    it('TC_LOCATION_05: Lỗi khi địa điểm không tồn tại (404)', async () => {
        Location.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Cập nhật ID không tồn tại`);
        try {
            await LocationService.updateLocation(999, { name: 'Đà Nẵng' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy khu vực');
        }
    });

    it('TC_LOCATION_06: Lỗi khi cập nhật đổi tên sang tên đã tồn tại (409)', async () => {
        const mockLocation = { id: 1, name: 'Hà Nội' };
        Location.findByPk.mockResolvedValue(mockLocation);
        Location.findOne.mockResolvedValue({ id: 2, name: 'Sài Gòn' });

        console.log(`[TEST]: Cập nhật trùng tên địa điểm khác`);
        try {
            await LocationService.updateLocation(1, { name: 'Sài Gòn' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Khu vực "Sài Gòn" đã tồn tại');
        }
    });

    it('TC_LOCATION_07: Ngăn chặn cập nhật trạng thái hoạt động qua hàm update (FScape Rule)', async () => {
        const mockLocation = { 
            id: 1, 
            name: 'Hà Nội', 
            update: jest.fn().mockResolvedValue(true)
        };
        Location.findByPk.mockResolvedValue(mockLocation);

        await LocationService.updateLocation(1, { is_active: false, name: 'Hà Nội X' });

        console.log(`[TEST]: Cập nhật có kèm is_active - Kiểm tra strip data`);
        // updateLocation strip is_active trước khi gọi update
        expect(mockLocation.update).toHaveBeenCalledWith(expect.not.objectContaining({
            is_active: false
        }));
        expect(mockLocation.update).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Hà Nội X'
        }));
    });
});
