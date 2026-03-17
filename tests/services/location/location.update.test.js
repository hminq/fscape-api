const LocationService = require('../../../services/location.service');
const { sequelize } = require('../../../config/db');

jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Location: {
                findByPk: jest.fn(),
                findOne: jest.fn()
            }
        }
    }
}));

describe('LocationService - updateLocation', () => {
    const { Location } = sequelize.models;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Cập nhật địa điểm thành công', async () => {
        const mockLocation = { 
            id: 1, 
            name: 'Quận 1', 
            update: jest.fn().mockResolvedValue({ id: 1, name: 'Quận 1 Updated' }) 
        };
        Location.findByPk.mockResolvedValue(mockLocation);
        Location.findOne.mockResolvedValue(null);

        const updateData = { name: 'Quận 1 Updated' };
        const result = await LocationService.updateLocation(1, updateData);

        console.log(`[TEST]: Cập nhật địa điểm`);
        console.log(`- Input   : ID=1, Data=${JSON.stringify(updateData)}`);
        console.log(`- Expected: Name="Quận 1 Updated"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Quận 1 Updated');
    });

    it('Cập nhật tên địa điểm thành null', async () => {
        const mockLocation = {
            id: 1,
            name: 'Quận 1',
            update: jest.fn().mockRejectedValue(new Error('name cannot be null'))
        };
        Location.findByPk.mockResolvedValue(mockLocation);

        const updateData = { name: null };
        const expectedError = 'name cannot be null';

        console.log(`[TEST]: Cập nhật tên địa điểm thành null`);
        console.log(`- Input   : ID=1, Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.updateLocation(1, updateData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật địa điểm thất bại do trùng tên với ID khác', async () => {
        const mockLocation = { id: 1, name: 'Quận 1' };
        Location.findByPk.mockResolvedValue(mockLocation);
        Location.findOne.mockResolvedValue({ id: 2, name: 'Quận 2' }); // Trùng với ID 2

        const updateData = { name: 'Quận 2' };
        const expectedError = 'Location "Quận 2" already exists';

        console.log(`[TEST]: Cập nhật trùng tên`);
        console.log(`- Input   : ID=1, Name="Quận 2" (Đã tồn tại ở ID 2)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.updateLocation(1, updateData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
