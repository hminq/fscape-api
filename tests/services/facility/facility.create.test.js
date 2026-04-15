const FacilityService = require('../../../services/facility.service');
const Facility = require('../../../models/facility.model');

jest.mock('../../../models/facility.model');

describe('FacilityService - createFacility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Tạo Facility mới thành công', async () => {
        const newData = { name: 'Máy lọc nước', is_active: true };
        Facility.findOne.mockResolvedValue(null);
        Facility.create.mockResolvedValue({ id: 10, ...newData });

        const result = await FacilityService.createFacility(newData);

        expect(result.name).toBe('Máy lọc nước');
    });

    it('Tên Facility bị null hoặc trống', async () => {
        const newData = { name: '' };
        const expectedError = 'Tên tiện ích không được để trống';

        try {
            await FacilityService.createFacility(newData);
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Trùng tên Facility', async () => {
        const newData = { name: 'Wifi' };
        Facility.findOne.mockResolvedValue({ id: 1, name: 'Wifi' });
        const expectedError = 'Tiện ích "Wifi" đã tồn tại';

        try {
            await FacilityService.createFacility(newData);
        } catch (error) {
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });
});
