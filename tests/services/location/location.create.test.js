const LocationService = require('../../../services/location.service');
const { sequelize } = require('../../../config/db');

jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Location: {
                findOne: jest.fn(),
                create: jest.fn()
            }
        }
    }
}));

describe('LocationService - createLocation', () => {
    const { Location } = sequelize.models;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Tạo địa điểm thành công', async () => {
        const newData = { name: 'Hà Nội' };
        Location.findOne.mockResolvedValue(null);
        Location.create.mockResolvedValue({ id: 10, ...newData });

        const result = await LocationService.createLocation(newData);

        console.log(`[TEST]: Tạo địa điểm mới`);
        console.log(`- Input   : Name="${newData.name}"`);
        console.log(`- Expected: Name="Hà Nội"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Hà Nội');
    });

    it('Tên địa điểm bị null', async () => {
        const newData = { name: null };
        Location.findOne.mockResolvedValue(null);
        Location.create.mockRejectedValue(new Error('name cannot be null'));

        const expectedError = 'name cannot be null';

        console.log(`[TEST]: Tạo địa điểm với tên bị null`);
        console.log(`- Input   : Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.createLocation(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Địa điểm đã tồn tại (Trùng tên)', async () => {
        const newData = { name: 'Hà Nội' };
        Location.findOne.mockResolvedValue({ id: 1, name: 'Hà Nội' });
        const expectedError = 'Location "Hà Nội" already exists';

        console.log(`[TEST]: Trùng tên địa điểm`);
        console.log(`- Input   : Name="Hà Nội"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.createLocation(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
