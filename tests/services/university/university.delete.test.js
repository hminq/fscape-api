const UniversityService = require('../../../services/university.service');
const University = require('../../../models/university.model');

jest.mock('../../../models/university.model');

describe('UniversityService - deleteUniversity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Xóa University thành công', async () => {
        const mockUni = { 
            id: 1, 
            name: 'Đại học Bách Khoa', 
            destroy: jest.fn().mockResolvedValue(true) 
        };
        University.findByPk.mockResolvedValue(mockUni);

        const result = await UniversityService.deleteUniversity(1);

        console.log(`[TEST]: Xóa University thành công`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: "University \"Đại học Bách Khoa\" deleted successfully"`);
        console.log(`- Actual  : "${result.message}"`);

        expect(result.message).toContain('deleted successfully');
    });

    it('Xóa University không tồn tại', async () => {
        University.findByPk.mockResolvedValue(null);
        const expectedError = 'University not found';

        console.log(`[TEST]: Xóa University không tồn tại`);
        console.log(`- Input   : ID=999`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.deleteUniversity(999);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Xóa University với ID bị null', async () => {
        University.findByPk.mockResolvedValue(null);
        const expectedError = 'University not found';

        console.log(`[TEST]: Xóa University với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.deleteUniversity(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
