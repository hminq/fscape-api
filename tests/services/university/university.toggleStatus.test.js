const UniversityService = require('../../../services/university.service');
const University = require('../../../models/university.model');

jest.mock('../../../models/university.model');

describe('UniversityService - toggleUniversityStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Kích hoạt University thành công', async () => {
        const mockUni = { 
            id: 1, 
            is_active: false, 
            save: jest.fn().mockResolvedValue(true) 
        };
        University.findByPk.mockResolvedValue(mockUni);

        const result = await UniversityService.toggleUniversityStatus(1, true);

        console.log(`[TEST]: Kích hoạt University (Active)`);
        console.log(`- Input   : ID=1, isActive=true`);
        console.log(`- Expected: is_active=true`);
        console.log(`- Actual  : is_active=${result.is_active}`);

        expect(result.is_active).toBe(true);
        expect(mockUni.save).toHaveBeenCalled();
    });

    it('Vô hiệu hóa University thành công', async () => {
        const mockUni = { 
            id: 1, 
            is_active: true, 
            save: jest.fn().mockResolvedValue(true) 
        };
        University.findByPk.mockResolvedValue(mockUni);

        const result = await UniversityService.toggleUniversityStatus(1, false);

        console.log(`[TEST]: Vô hiệu hóa University (Inactive)`);
        console.log(`- Input   : ID=1, isActive=false`);
        console.log(`- Expected: is_active=false`);
        console.log(`- Actual  : is_active=${result.is_active}`);

        expect(result.is_active).toBe(false);
        expect(mockUni.save).toHaveBeenCalled();
    });

    it('Lỗi khi trạng thái mới trùng với trạng thái hiện tại (University)', async () => {
        const mockUni = { id: 1, is_active: true };
        University.findByPk.mockResolvedValue(mockUni);
        const expectedError = 'University is already active';

        console.log(`[TEST]: Trùng trạng thái hiện tại (University)`);
        console.log(`- Input   : ID=1, isActive=true`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.toggleUniversityStatus(1, true);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('ID University bị null khi đổi trạng thái', async () => {
        University.findByPk.mockResolvedValue(null);
        const expectedError = 'University not found';

        console.log(`[TEST]: Đổi trạng thái với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.toggleUniversityStatus(null, true);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
