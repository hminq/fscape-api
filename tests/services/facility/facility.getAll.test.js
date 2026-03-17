const FacilityService = require('../../../services/facility.service');
const Facility = require('../../../models/facility.model');

jest.mock('../../../models/facility.model');

describe('FacilityService - getAllFacilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy danh sách tiện ích thành công', async () => {
        const mockRows = [{ id: 1, name: 'Wifi', is_active: true }];
        Facility.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { page: 1, limit: 10 };
        const result = await FacilityService.getAllFacilities(query, { role: 'ADMIN' });

        console.log(`[TEST]: Lấy danh sách Facility`);
        console.log(`- Input   : Query=${JSON.stringify(query)}`);
        console.log(`- Expected: Total=1, data[0].name="Wifi"`);
        console.log(`- Actual  : Total=${result.total}, data[0].name="${result.data[0].name}"`);

        expect(result.total).toBe(1);
        expect(result.data[0].name).toBe('Wifi');
    });

    it('Tìm kiếm tiện ích theo tên', async () => {
        const mockRows = [{ id: 2, name: 'Thang máy' }];
        Facility.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { search: 'Thang' };
        const result = await FacilityService.getAllFacilities(query, { role: 'ADMIN' });

        console.log(`[TEST]: Tìm kiếm Facility theo tên`);
        console.log(`- Input   : Search="Thang"`);
        console.log(`- Expected: Name chứa "Thang"`);
        console.log(`- Actual  : Name="${result.data[0].name}"`);

        expect(result.data[0].name).toBe('Thang máy');
    });
});
