const UniversityService = require('../../../services/university.service');
const University = require('../../../models/university.model');
const Building = require('../../../models/building.model');

jest.mock('../../../models/university.model');
jest.mock('../../../models/location.model');
jest.mock('../../../models/building.model');

describe('UniversityService - getUniversityById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        University.findByPk.mockResolvedValue(null);
        Building.findAll.mockResolvedValue([]);
        console.log('\n=========================================================================');
    });

    it('TC_UNIVERSITY_01: Lấy chi tiết trường đại học thành công (Happy Path)', async () => {
        const mockUni = { 
            id: 1, 
            name: 'Đại học Bách Khoa', 
            location_id: 10,
            toJSON: () => ({ id: 1, name: 'Đại học Bách Khoa', location_id: 10 })
        };
        University.findByPk.mockResolvedValue(mockUni);
        Building.findAll.mockResolvedValue([{ id: 'b1', name: 'Building A' }]);

        const result = await UniversityService.getUniversityById(1);

        console.log(`[TEST]: Lấy chi tiết University thành công`);

        expect(result.name).toBe('Đại học Bách Khoa');
        expect(result.nearby_buildings).toHaveLength(1);
        expect(Building.findAll).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ location_id: 10 })
        }));
    });

    it('TC_UNIVERSITY_02: Lỗi khi trường đại học không tồn tại (404)', async () => {
        University.findByPk.mockResolvedValue(null);
        const expectedError = 'Không tìm thấy trường đại học';

        console.log(`[TEST]: University không tồn tại`);
        try {
            await UniversityService.getUniversityById(999);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe(expectedError);
        }
    });

    it('TC_UNIVERSITY_03: Truy vấn với ID không hợp lệ (Abnormal)', async () => {
        const expectedError = 'Không tìm thấy trường đại học';

        console.log(`[TEST]: Truy vấn University với ID=null`);
        try {
            await UniversityService.getUniversityById(null);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
