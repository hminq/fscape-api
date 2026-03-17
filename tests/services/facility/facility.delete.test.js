const FacilityService = require('../../../services/facility.service');
const Facility = require('../../../models/facility.model');
const BuildingFacility = require('../../../models/buildingFacility.model');

jest.mock('../../../models/facility.model');
jest.mock('../../../models/buildingFacility.model');

describe('FacilityService - deleteFacility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Xóa Facility thành công', async () => {
        const mockFacility = { 
            id: 1, 
            name: 'Gym', 
            destroy: jest.fn().mockResolvedValue(true) 
        };
        Facility.findByPk.mockResolvedValue(mockFacility);
        BuildingFacility.count.mockResolvedValue(0);

        const result = await FacilityService.deleteFacility(1);

        console.log(`[TEST]: Xóa Facility thành công`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: "Facility \"Gym\" deleted successfully"`);
        console.log(`- Actual  : "${result.message}"`);

        expect(result.message).toContain('deleted successfully');
        expect(mockFacility.destroy).toHaveBeenCalled();
    });

    it('Chặn xóa Facility vì có tòa nhà đang gán tiện ích này', async () => {
        const mockFacility = { id: 1, name: 'Bể bơi' };
        Facility.findByPk.mockResolvedValue(mockFacility);
        BuildingFacility.count.mockResolvedValue(3); // Có 3 tòa nhà đang sử dụng
        const expectedError = 'Facility cannot be deleted because it is assigned to 3 building(s).';

        console.log(`[TEST]: Lỗi xóa Facility đang được sử dụng`);
        console.log(`- Input   : ID=1 (Có 3 tòa nhà liên kết)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await FacilityService.deleteFacility(1);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Xóa Facility với ID bị null', async () => {
        Facility.findByPk.mockResolvedValue(null);
        const expectedError = 'Facility not found';

        console.log(`[TEST]: Xóa Facility với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await FacilityService.deleteFacility(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
