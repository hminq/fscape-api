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
            name: 'Hà Nội', 
            update: jest.fn().mockResolvedValue({ id: 1, name: 'Hà Nội Mới' }) 
        };
        Location.findByPk.mockResolvedValue(mockLocation);
        Location.findOne.mockResolvedValue(null);

        const updateData = { name: 'Hà Nội Mới' };
        const result = await LocationService.updateLocation(1, updateData);

        console.log(`[TEST]: Cập nhật địa điểm`);
        console.log(`- Input   : ID=1, Data=${JSON.stringify(updateData)}`);
        console.log(`- Expected: Name="Hà Nội Mới"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Hà Nội Mới');
    });

    it('Cập nhật tên địa điểm thành null', async () => {
        const mockLocation = {
            id: 1,
            name: 'Hà Nội'
        };
        Location.findByPk.mockResolvedValue(mockLocation);

        const updateData = { name: null };
        const expectedError = 'Tên khu vực không được để trống';

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
        const mockLocation = { id: 1, name: 'Hà Nội' };
        Location.findByPk.mockResolvedValue(mockLocation);
        Location.findOne.mockResolvedValue({ id: 2, name: 'Sài Gòn' }); // Trùng với ID 2

        const updateData = { name: 'Sài Gòn' };
        const expectedError = 'Khu vực "Sài Gòn" đã tồn tại';

        console.log(`[TEST]: Cập nhật trùng tên`);
        console.log(`- Input   : ID=1, Name="Sài Gòn" (Đã tồn tại ở ID 2)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.updateLocation(1, updateData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật địa điểm thất bại do ID không tồn tại', async () => {
        Location.findByPk.mockResolvedValue(null);
        const updateData = { name: 'Đà Nẵng' };
        const expectedError = 'Không tìm thấy khu vực';

        console.log(`[TEST]: Cập nhật ID không hợp lệ/không tồn tại`);
        console.log(`- Input   : ID=999`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.updateLocation(999, updateData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật thất bại do tên toàn khoảng trắng (tên rỗng)', async () => {
        const mockLocation = { id: 1, name: 'Hà Nội' };
        Location.findByPk.mockResolvedValue(mockLocation);
        
        const updateData = { name: '   ' };
        const expectedError = 'Tên khu vực không được để trống';

        console.log(`[TEST]: Cập nhật tên địa điểm bằng khoảng trắng`);
        console.log(`- Input   : ID=1, Name="   "`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await LocationService.updateLocation(1, updateData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
