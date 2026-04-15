const FacilityService = require('../../../services/facility.service');
const Facility = require('../../../models/facility.model');

jest.mock('../../../models/facility.model');

describe('FacilityService - updateFacility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Cập nhật Facility thành công', async () => {
        const mockFacility = { 
            id: 1, 
            name: 'Wifi cũ', 
            update: jest.fn().mockResolvedValue(true) 
        };
        Facility.findByPk.mockResolvedValue(mockFacility);
        Facility.findOne.mockResolvedValue(null);

        const updateData = { name: 'Wifi 5G' };
        const result = await FacilityService.updateFacility(1, updateData);

        expect(mockFacility.update).toHaveBeenCalledWith(updateData);
    });

    it('Cập nhật tên trùng với Facility khác', async () => {
        const mockFacility = { id: 1, name: 'Wifi' };
        Facility.findByPk.mockResolvedValue(mockFacility);
        Facility.findOne.mockResolvedValue({ id: 2, name: 'Điều hòa' });
        const expectedError = 'Tiện ích "Điều hòa" đã tồn tại';

        try {
            await FacilityService.updateFacility(1, { name: 'Điều hòa' });
        } catch (error) {
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật tên bị trống', async () => {
        const mockFacility = { id: 1, name: 'Wifi' };
        Facility.findByPk.mockResolvedValue(mockFacility);
        const expectedError = 'Tên tiện ích không được để trống';

        try {
            await FacilityService.updateFacility(1, { name: '' });
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật Facility với ID không tồn tại', async () => {
        Facility.findByPk.mockResolvedValue(null);
        const expectedError = 'Không tìm thấy tiện ích';

        try {
            await FacilityService.updateFacility(null, { name: 'Test' });
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe(expectedError);
        }
    });
});
