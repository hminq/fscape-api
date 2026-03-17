const LocationService = require('../../../services/location.service');
const { sequelize } = require('../../../config/db');

jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Location: {
                findAndCountAll: jest.fn()
            }
        }
    }
}));

describe('LocationService - getAllLocations', () => {
    const { Location } = sequelize.models;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy danh sách địa điểm thành công', async () => {
        const mockRows = [{ id: 1, name: 'Hà Nội' }];
        Location.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { page: 1, limit: 10 };
        const result = await LocationService.getAllLocations(query);

        console.log(`[TEST]: Lấy danh sách địa điểm`);
        console.log(`- Input   : ${JSON.stringify(query)}`);
        console.log(`- Expected: Total=1, Page=1`);
        console.log(`- Actual  : Total=${result.total}, Page=${result.page}`);

        expect(result.total).toBe(1);
        expect(result.data).toEqual(mockRows);
    });

    it('Tìm kiếm địa điểm theo tên', async () => {
        const mockRows = [{ id: 1, name: 'Đà Nẵng' }];
        Location.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { search: 'Đà Nẵng' };
        const result = await LocationService.getAllLocations(query);

        console.log(`[TEST]: Tìm kiếm địa điểm`);
        console.log(`- Input   : Search="Đà Nẵng"`);
        console.log(`- Expected: Name="Đà Nẵng"`);
        console.log(`- Actual  : Name="${result.data[0].name}"`);

        expect(result.data[0].name).toBe('Đà Nẵng');
    });
});
