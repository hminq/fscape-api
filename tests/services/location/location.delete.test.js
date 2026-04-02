const LocationService = require('../../../services/location.service');
const { sequelize } = require('../../../config/db');

jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Location: {
                findByPk: jest.fn()
            },
            Building: { count: jest.fn() },
            University: { count: jest.fn() }
        }
    }
}));

describe('LocationService - deleteLocation', () => {
    const { Location, Building, University } = sequelize.models;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Xóa địa điểm thành công', async () => {
        const mockLocation = { 
            id: 1, 
            name: 'Hà Nội', 
            destroy: jest.fn().mockResolvedValue(true) 
        };
        Location.findByPk.mockResolvedValue(mockLocation);
        Building.count.mockResolvedValue(0);
        University.count.mockResolvedValue(0);

        const result = await LocationService.deleteLocation(1);

        console.log(`[TEST]: Xóa địa điểm thành công`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: "Đã xóa khu vực \"Hà Nội\" thành công"`);
        console.log(`- Actual  : "${result.message}"`);

        expect(result.message).toContain('thành công');
    });

    it('ID bị null', async () => {
        Location.findByPk.mockResolvedValue(null);
        const expectedError = 'Không tìm thấy khu vực';

        console.log(`[TEST]: Xóa địa điểm với ID bị null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.deleteLocation(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Không thể xóa địa điểm vì có dữ liệu liên kết', async () => {
        const mockLocation = { id: 1, name: 'Hà Nội' };
        Location.findByPk.mockResolvedValue(mockLocation);
        Building.count.mockResolvedValue(1); 
        University.count.mockResolvedValue(0);
        const expectedError = 'Không thể xóa khu vực: Vẫn còn dữ liệu liên kết.';

        console.log(`[TEST]: Lỗi xóa do có dữ liệu liên kết`);
        console.log(`- Input   : ID=1 (Có 1 tòa nhà liên kết)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.deleteLocation(1);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
