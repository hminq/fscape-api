const UniversityService = require('../../../services/university.service');
const University = require('../../../models/university.model');

jest.mock('../../../models/university.model');
jest.mock('../../../models/location.model');

describe('UniversityService - getAllUniversities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        University.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
        console.log('\n=========================================================================');
    });

    it('TC_UNIVERSITY_GET_01: Lấy danh sách trường đại học thành công (Happy Path)', async () => {
        const mockRows = [{ id: 1, name: 'Đại học Bách Khoa', is_active: true }];
        University.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { page: 1, limit: 10 };
        const result = await UniversityService.getAllUniversities(query);

        console.log(`[TEST]: Lấy danh sách University`);

        expect(result.total).toBe(1);
        expect(result.data).toHaveLength(1);
        expect(University.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            limit: 10,
            offset: 0
        }));
    });

    it('TC_UNIVERSITY_GET_02: Tìm kiếm trường theo tên (Search filter)', async () => {
        const mockRows = [{ id: 1, name: 'Đại học Kinh tế' }];
        University.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { search: 'Kinh tế' };
        const result = await UniversityService.getAllUniversities(query);

        console.log(`[TEST]: Tìm kiếm University`);
        expect(result.data[0].name).toBe('Đại học Kinh tế');
        expect(University.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                name: expect.any(Object) // iLike object
            })
        }));
    });
});
