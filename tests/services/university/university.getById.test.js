const UniversityService = require('../../../services/university.service');
const University = require('../../../models/university.model');
const Building = require('../../../models/building.model');

jest.mock('../../../models/university.model');
jest.mock('../../../models/location.model');
jest.mock('../../../models/building.model');

describe('UniversityService - getUniversityById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy chi tiết trường đại học thành công', async () => {
        const mockUni = { 
            id: 1, 
            name: 'Đại học Bách Khoa', 
            location_id: 10,
            toJSON: () => ({ id: 1, name: 'Đại học Bách Khoa', location_id: 10 })
        };
         University.findByPk.mockResolvedValue(mockUni);
         Building.findAll.mockResolvedValue([{ id: 'b1', name: 'Building A' }]);

        const result = await UniversityService.getUniversityById(1);

        console.log(`[TEST]: Lấy chi tiết University`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: Name="Đại học Bách Khoa", Has nearby buildings`);
        console.log(`- Actual  : Name="${result.name}", BuildingsCount=${result.nearby_buildings.length}`);

        expect(result.name).toBe('Đại học Bách Khoa');
        expect(result.nearby_buildings.length).toBe(1);
    });

    it('Trường đại học không tồn tại', async () => {
        University.findByPk.mockResolvedValue(null);
        const expectedError = 'University not found';

        console.log(`[TEST]: University không tồn tại`);
        console.log(`- Input   : ID=999`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.getUniversityById(999);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('ID University bị null', async () => {
        const expectedError = 'University not found';

        console.log(`[TEST]: Truy vấn University với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.getUniversityById(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
