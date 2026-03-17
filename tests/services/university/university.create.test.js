const UniversityService = require('../../../services/university.service');
const University = require('../../../models/university.model');

jest.mock('../../../models/university.model');

describe('UniversityService - createUniversity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Tạo University mới thành công', async () => {
        const newData = { name: 'Đại học FPT', location_id: 1, address: 'Khu công nghệ cao' };
        University.findOne.mockResolvedValue(null);
        University.create.mockResolvedValue({ id: 5, ...newData });

        const result = await UniversityService.createUniversity(newData);

        console.log(`[TEST]: Tạo University mới`);
        console.log(`- Input   : Name="${newData.name}", LocationID=${newData.location_id}, Address="${newData.address}"`);
        console.log(`- Expected: Name="Đại học FPT"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Đại học FPT');
    });

    it('Tên University bị null', async () => {
        const newData = { name: null, location_id: 1, address: 'Hà Nội' };
        const expectedError = 'University name is required';

        console.log(`[TEST]: Tạo University với tên bị null`);
        console.log(`- Input   : Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.createUniversity(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Khu vực (location_id) bị null', async () => {
        const newData = { name: 'Đại học X', location_id: null, address: '123 ABC' };
        const expectedError = 'Location ID is required';

        console.log(`[TEST]: Tạo University với khu vực bị null`);
        console.log(`- Input   : location_id=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.createUniversity(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Địa chỉ bị null', async () => {
        const newData = { name: 'Đại học Y', location_id: 1, address: null };
        const expectedError = 'Address is required';

        console.log(`[TEST]: Tạo University với địa chỉ bị null`);
        console.log(`- Input   : address=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.createUniversity(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Trùng tên University', async () => {
        const newData = { name: 'Đại học Bách Khoa', location_id: 1, address: 'Hà Nội' };
        University.findOne.mockResolvedValue({ id: 1, name: 'Đại học Bách Khoa' });
        const expectedError = 'University "Đại học Bách Khoa" already exists';

        console.log(`[TEST]: Trùng tên University`);
        console.log(`- Input   : Name="Đại học Bách Khoa", LocationID=1, Address="Hà Nội"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await UniversityService.createUniversity(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });
});
