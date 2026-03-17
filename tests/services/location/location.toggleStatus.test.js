const LocationService = require('../../../services/location.service');
const { sequelize } = require('../../../config/db');

jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Location: {
                findByPk: jest.fn()
            }
        }
    }
}));

describe('LocationService - toggleLocationStatus', () => {
    const { Location } = sequelize.models;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Kích hoạt địa điểm thành công', async () => {
        const mockLocation = { 
            id: 1, 
            is_active: false, 
            save: jest.fn().mockResolvedValue(true) 
        };
        Location.findByPk.mockResolvedValue(mockLocation);

        const result = await LocationService.toggleLocationStatus(1, true);

        console.log(`[TEST]: Kích hoạt địa điểm (Active)`);
        console.log(`- Input   : ID=1, isActive=true`);
        console.log(`- Expected: is_active=true`);
        console.log(`- Actual  : is_active=${result.is_active}`);

        expect(result.is_active).toBe(true);
        expect(mockLocation.save).toHaveBeenCalled();
    });

    it('Vô hiệu hóa địa điểm thành công', async () => {
        const mockLocation = { 
            id: 1, 
            is_active: true, 
            save: jest.fn().mockResolvedValue(true) 
        };
        Location.findByPk.mockResolvedValue(mockLocation);

        const result = await LocationService.toggleLocationStatus(1, false);

        console.log(`[TEST]: Vô hiệu hóa địa điểm (Inactive)`);
        console.log(`- Input   : ID=1, isActive=false`);
        console.log(`- Expected: is_active=false`);
        console.log(`- Actual  : is_active=${result.is_active}`);

        expect(result.is_active).toBe(false);
        expect(mockLocation.save).toHaveBeenCalled();
    });

    it('Lỗi khi trạng thái mới trùng với trạng thái hiện tại', async () => {
        const mockLocation = { id: 1, is_active: true };
        Location.findByPk.mockResolvedValue(mockLocation);
        const expectedError = 'Location is already active';

        console.log(`[TEST]: Trùng trạng thái hiện tại`);
        console.log(`- Input   : ID=1, isActive=true (Địa điểm đang active)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.toggleLocationStatus(1, true);
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
            await LocationService.toggleLocationStatus(999, true);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('ID bị null', async () => {
        Location.findByPk.mockResolvedValue(null);
        const expectedError = 'Location not found';

        console.log(`[TEST]: Toggle trạng thái với ID bị null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.toggleLocationStatus(null, true);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
