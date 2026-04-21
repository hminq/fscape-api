const UniversityService = require('../../../services/university.service');
const University = require('../../../models/university.model');

jest.mock('../../../models/university.model');

describe('UniversityService - toggleUniversityStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        University.findByPk.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_UNIVERSITY_01: Kích hoạt University thành công (Happy Path)', async () => {
        const mockUni = { 
            id: 1, 
            is_active: false, 
            save: jest.fn().mockResolvedValue(true) 
        };
        University.findByPk.mockResolvedValue(mockUni);

        const result = await UniversityService.toggleUniversityStatus(1, true);

        console.log(`[TEST]: Kích hoạt University (Active)`);
        expect(result.is_active).toBe(true);
        expect(mockUni.save).toHaveBeenCalled();
    });

    it('TC_UNIVERSITY_02: Vô hiệu hóa University thành công (Happy Path)', async () => {
        const mockUni = { 
            id: 1, 
            is_active: true, 
            save: jest.fn().mockResolvedValue(true) 
        };
        University.findByPk.mockResolvedValue(mockUni);

        const result = await UniversityService.toggleUniversityStatus(1, false);

        console.log(`[TEST]: Vô hiệu hóa University (Inactive)`);
        expect(result.is_active).toBe(false);
        expect(mockUni.save).toHaveBeenCalled();
    });

    it('TC_UNIVERSITY_03: Lỗi khi trạng thái mới trùng với trạng thái hiện tại (400)', async () => {
        const mockUni = { id: 1, is_active: true };
        University.findByPk.mockResolvedValue(mockUni);
        const expectedError = 'Trường đại học đã ở trạng thái hoạt động';

        console.log(`[TEST]: Trùng trạng thái hiện tại (University)`);
        try {
            await UniversityService.toggleUniversityStatus(1, true);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('TC_UNIVERSITY_04: Lỗi khi ID không tồn tại (404)', async () => {
        University.findByPk.mockResolvedValue(null);
        const expectedError = 'Không tìm thấy trường đại học';

        console.log(`[TEST]: Đổi trạng thái với ID không tồn tại`);
        try {
            await UniversityService.toggleUniversityStatus(999, true);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe(expectedError);
        }
    });
});
