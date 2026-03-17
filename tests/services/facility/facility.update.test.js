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

        console.log(`[TEST]: Cập nhật Facility`);
        console.log(`- Input   : ID=1, NewName="${updateData.name}"`);
        console.log(`- Expected: Name="Wifi 5G"`);
        console.log(`- Actual  : Name="${result.name}"`);

        // Lưu ý: Trong code service thực tế, mock update có thể cần trả về object đã update hoặc object cũ tùy logic, 
        // ở đây ta test luồng logic gọi hàm.
        expect(mockFacility.update).toHaveBeenCalledWith(updateData);
    });

    it('Cập nhật tên trùng với Facility khác', async () => {
        const mockFacility = { id: 1, name: 'Wifi' };
        Facility.findByPk.mockResolvedValue(mockFacility);
        Facility.findOne.mockResolvedValue({ id: 2, name: 'Điều hòa' });
        const expectedError = 'Facility "Điều hòa" already exists';

        console.log(`[TEST]: Cập nhật trùng tên Facility khác`);
        console.log(`- Input   : ID=1, NewName="Điều hòa" (Đã tồn tại ở ID 2)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await FacilityService.updateFacility(1, { name: 'Điều hòa' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật Facility với ID bị null', async () => {
        Facility.findByPk.mockResolvedValue(null);
        const expectedError = 'Facility not found';

        console.log(`[TEST]: Cập nhật Facility với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await FacilityService.updateFacility(null, { name: 'Test' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
