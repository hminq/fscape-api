const UniversityService = require('../../../services/university.service');
const University = require('../../../models/university.model');

jest.mock('../../../models/university.model');
jest.mock('../../../models/location.model');

describe('UniversityService - getAllUniversities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy danh sách trường đại học thành công', async () => {
        const mockRows = [{ id: 1, name: 'Đại học Bách Khoa', is_active: true }];
        University.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { page: 1, limit: 10 };
        const result = await UniversityService.getAllUniversities(query);

        console.log(`[TEST]: Lấy danh sách University`);
        console.log(`- Input   : Query=${JSON.stringify(query)}`);
        console.log(`- Expected: Total=1, page=1`);
        console.log(`- Actual  : Total=${result.total}, page=${result.page}`);

        expect(result.total).toBe(1);
        expect(result.data).toEqual(mockRows);
    });

    it('Tìm kiếm trường theo tên', async () => {
        const mockRows = [{ id: 1, name: 'Đại học Kinh tế' }];
        University.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { search: 'Kinh tế' };
        const result = await UniversityService.getAllUniversities(query);

        console.log(`[TEST]: Tìm kiếm University`);
        console.log(`- Input   : Search="Kinh tế"`);
        console.log(`- Expected: Đại học Kinh tế`);
        console.log(`- Actual  : ${result.data[0].name}`);

        expect(result.data[0].name).toBe('Đại học Kinh tế');
    });
});
