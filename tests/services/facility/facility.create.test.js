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

        console.log(`[TEST]: Tạo Facility mới`);
        console.log(`- Input   : Name="${newData.name}"`);
        console.log(`- Expected: Name="Máy lọc nước"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Máy lọc nước');
    });

    it('Tên Facility bị null hoặc trống', async () => {
        const newData = { name: null };
        Facility.findOne.mockResolvedValue(null);
        // Giả sử database throw lỗi nếu null, hoặc ta thêm validation vào service sau
        Facility.create.mockRejectedValue(new Error('name cannot be null'));
        const expectedError = 'name cannot be null';

        console.log(`[TEST]: Tạo Facility với tên bị null`);
        console.log(`- Input   : Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await FacilityService.createFacility(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Trùng tên Facility', async () => {
        const newData = { name: 'Wifi' };
        Facility.findOne.mockResolvedValue({ id: 1, name: 'Wifi' });
        const expectedError = 'Facility "Wifi" already exists';

        console.log(`[TEST]: Trùng tên Facility`);
        console.log(`- Input   : Name="Wifi"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await FacilityService.createFacility(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });
});
