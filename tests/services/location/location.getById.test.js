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

describe('LocationService - getLocationById', () => {
    const { Location } = sequelize.models;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy chi tiết địa điểm thành công', async () => {
        const mockLocation = { id: 1, name: 'Quận 1' };
        Location.findByPk.mockResolvedValue(mockLocation);

        const result = await LocationService.getLocationById(1);

        console.log(`[TEST]: Lấy chi tiết địa điểm`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: Name="Quận 1"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Quận 1');
    });

    it('ID bị null', async () => {
        Location.findByPk.mockResolvedValue(null);
        const expectedError = 'Location not found';

        console.log(`[TEST]: Truy vấn với ID bị null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.getLocationById(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Địa điểm không tồn tại', async () => {
        Location.findByPk.mockResolvedValue(null);
        const expectedError = 'Location not found';

        console.log(`[TEST]: Địa điểm không tồn tại`);
        console.log(`- Input   : ID=999`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.getLocationById(999);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
