const FacilityService = require('../../../services/facility.service');
const Facility = require('../../../models/facility.model');

jest.mock('../../../models/facility.model');

describe('FacilityService - getFacilityById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy chi tiết tiện ích thành công', async () => {
        const mockFacility = { 
            id: 1, 
            name: 'Điều hòa',
            buildings: []
        };
        Facility.findByPk.mockResolvedValue(mockFacility);

        const result = await FacilityService.getFacilityById(1);

        console.log(`[TEST]: Lấy chi tiết Facility`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: Name="Điều hòa"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Điều hòa');
    });

    it('Tiện ích không tồn tại', async () => {
        Facility.findByPk.mockResolvedValue(null);
        const expectedError = 'Facility not found';

        console.log(`[TEST]: Facility không tồn tại`);
        console.log(`- Input   : ID=999`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await FacilityService.getFacilityById(999);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('ID Facility bị null', async () => {
        const expectedError = 'Facility not found';

        console.log(`[TEST]: Truy vấn Facility với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await FacilityService.getFacilityById(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
