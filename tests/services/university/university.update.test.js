const UniversityService = require('../../../services/university.service');
const University = require('../../../models/university.model');

jest.mock('../../../models/university.model');

describe('UniversityService - updateUniversity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Cập nhật University thành công', async () => {
        const mockUni = { 
            id: 1, 
            name: 'Đại học A', 
            update: jest.fn().mockResolvedValue({ id: 1, name: 'Đại học A Updated' }) 
        };
        University.findByPk.mockResolvedValue(mockUni);
        University.findOne.mockResolvedValue(null);

        const updateData = { name: 'Đại học A Updated' };
        const result = await UniversityService.updateUniversity(1, updateData);

        console.log(`[TEST]: Cập nhật University`);
        console.log(`- Input   : ID=1, NewName="${updateData.name}"`);
        console.log(`- Expected: Name="Đại học A Updated"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Đại học A Updated');
    });

    it('Cập nhật tên University thành null', async () => {
        const mockUni = { id: 1, name: 'Đại học A' };
        University.findByPk.mockResolvedValue(mockUni);
        const expectedError = 'University name cannot be empty';

        console.log(`[TEST]: Cập nhật tên University thành null`);
        console.log(`- Input   : ID=1, Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.updateUniversity(1, { name: null });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật khu vực (location_id) thành null', async () => {
        const mockUni = { id: 1, name: 'Đại học A' };
        University.findByPk.mockResolvedValue(mockUni);
        const expectedError = 'Location ID cannot be empty';

        console.log(`[TEST]: Cập nhật University với khu vực bị null`);
        console.log(`- Input   : ID=1, location_id=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.updateUniversity(1, { location_id: null });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật địa chỉ thành null', async () => {
        const mockUni = { id: 1, name: 'Đại học A' };
        University.findByPk.mockResolvedValue(mockUni);
        const expectedError = 'Address cannot be empty';

        console.log(`[TEST]: Cập nhật University với địa chỉ bị null`);
        console.log(`- Input   : ID=1, address=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.updateUniversity(1, { address: null });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật trùng tên với University khác', async () => {
        const mockUni = { id: 1, name: 'Đại học A' };
        University.findByPk.mockResolvedValue(mockUni);
        University.findOne.mockResolvedValue({ id: 2, name: 'Đại học B' });
        const expectedError = 'University name already exists';

        console.log(`[TEST]: Cập nhật trùng tên University khác`);
        console.log(`- Input   : ID=1, Name="Đại học B" (Đã tồn tại ở ID 2)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.updateUniversity(1, { name: 'Đại học B' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });
});
