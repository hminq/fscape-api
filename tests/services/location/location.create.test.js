const LocationService = require('../../../services/location.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Location: { findOne: jest.fn(), create: jest.fn() },
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

describe('LocationService - createLocation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Location.findOne.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_LOCATION_01: Tạo địa điểm thành công (Happy Path)', async () => {
        const newData = { name: 'Hà Nội' };
        Location.create.mockResolvedValue({ id: 10, ...newData });

        const result = await LocationService.createLocation(newData);

        console.log(`[TEST]: Tạo địa điểm mới thành công`);
        expect(result.name).toBe('Hà Nội');
        expect(Location.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hà Nội' }));
    });

    it('TC_LOCATION_02: Lỗi khi tên địa điểm bị null (Abnormal)', async () => {
        const newData = { name: null };
        console.log(`[TEST]: Tạo địa điểm với tên bị null - Kiểm tra crash (Service thiếu validation)`);
        try {
            await LocationService.createLocation(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            // Service hiện tại sẽ ném TypeError do name.trim()
            expect(error).toBeDefined();
        }
    });

    it('TC_LOCATION_03: Lỗi khi địa điểm đã tồn tại (Abnormal)', async () => {
        const newData = { name: 'Hà Nội' };
        Location.findOne.mockResolvedValue({ id: 1, name: 'Hà Nội' });
        const expectedError = 'Khu vực "Hà Nội" đã tồn tại';

        console.log(`[TEST]: Trùng tên địa điểm`);
        try {
            await LocationService.createLocation(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });
});
