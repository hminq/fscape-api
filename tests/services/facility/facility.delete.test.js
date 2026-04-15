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

        expect(result.message).toContain('thành công');
        expect(mockFacility.destroy).toHaveBeenCalled();
    });

    it('Chặn xóa Facility vì có tòa nhà đang gán tiện ích này', async () => {
        const mockFacility = { id: 1, name: 'Bể bơi' };
        Facility.findByPk.mockResolvedValue(mockFacility);
        BuildingFacility.count.mockResolvedValue(3); 
        const expectedError = 'Không thể xóa tiện ích vì đang được gán cho 3 tòa nhà.';

        try {
            await FacilityService.deleteFacility(1);
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Xóa Facility với ID không tồn tại', async () => {
        Facility.findByPk.mockResolvedValue(null);
        const expectedError = 'Không tìm thấy tiện ích';

        try {
            await FacilityService.deleteFacility(null);
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe(expectedError);
        }
    });
});
