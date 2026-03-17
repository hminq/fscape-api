const BuildingService = require('../../../services/building.service');
const Building = require('../../../models/building.model');
const Location = require('../../../models/location.model');

jest.mock('../../../models/building.model');
jest.mock('../../../models/location.model');
jest.mock('../../../models/buildingImage.model');
jest.mock('../../../models/facility.model');

describe('BuildingService - getAllBuildings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy danh sách tòa nhà thành công (Admin)', async () => {
        const mockRows = [{ id: 1, name: 'Building A', is_active: true }];
        Building.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { page: 1, limit: 10 };
        const user = { role: 'ADMIN' };
        const result = await BuildingService.getAllBuildings(query, user);

        console.log(`[TEST]: Lấy danh sách tòa nhà (Admin)`);
        console.log(`- Input   : Query=${JSON.stringify(query)}, UserRole="ADMIN"`);
        console.log(`- Expected: Total=1, Page=1`);
        console.log(`- Actual  : Total=${result.total}, Page=${result.page}`);

        expect(result.total).toBe(1);
        expect(result.data).toEqual(mockRows);
    });

    it('Tìm kiếm tòa nhà theo tên', async () => {
        const mockRows = [{ id: 1, name: 'Sunlight Building' }];
        Building.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { search: 'Sunlight' };
        const result = await BuildingService.getAllBuildings(query, { role: 'ADMIN' });

        console.log(`[TEST]: Tìm kiếm tòa nhà`);
        console.log(`- Input   : Search="Sunlight"`);
        console.log(`- Expected: Name="Sunlight Building"`);
        console.log(`- Actual  : Name="${result.data[0].name}"`);

        expect(result.data[0].name).toBe('Sunlight Building');
    });

    it('Lỗi khi Manager/Staff truy cập danh sách chuẩn', async () => {
        const user = { role: 'BUILDING_MANAGER' };
        const expectedError = 'Managers and staff must access their specific assigned building endpoint';

        console.log(`[TEST]: Chặn Manager truy cập list chung`);
        console.log(`- Input   : UserRole="BUILDING_MANAGER"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.getAllBuildings({}, user);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
