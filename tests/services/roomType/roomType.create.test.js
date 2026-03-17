const RoomTypeService = require('../../../services/roomType.service');
const RoomType = require('../../../models/roomType.model');

jest.mock('../../../models/roomType.model');
jest.mock('../../../models/room.model');
jest.mock('../../../models/roomTypeAsset.model');
jest.mock('../../../models/assetType.model');

describe('RoomTypeService - createRoomType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Tạo loại phòng thành công - các giá trị default an toàn', async () => {
        const newData = { name: 'Phòng Mới', base_price: 1500000 };
        RoomType.findOne.mockResolvedValue(null);
        RoomType.create.mockResolvedValue({ id: 1, ...newData });

        const result = await RoomTypeService.createRoomType({ ...newData });

        console.log(`[TEST]: Tạo loại phòng hợp lệ`);
        console.log(`- Input   : Name="Phòng Mới", base_price=1500000`);
        console.log(`- Expected: Gửi yêu cầu create vào DB`);

        expect(RoomType.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Phòng Mới',
            base_price: 1500000,
            deposit_months: 1 // Forced to 1
        }));
        expect(result.id).toBe(1);
    });

    it('Lỗi thiếu name', async () => {
        const newData = { base_price: 1000000 };

        console.log(`[TEST]: Tạo loại phòng thiếu name`);
        try {
            await RoomTypeService.createRoomType(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Room type name is required');
        }
    });

    it('Lỗi trùng tên loại phòng', async () => {
        const newData = { name: 'Phòng Cũ', base_price: 1000000 };
        RoomType.findOne.mockResolvedValue({ id: 2, name: 'Phòng Cũ' });

        console.log(`[TEST]: Tạo loại phòng bị trùng tên`);
        try {
            await RoomTypeService.createRoomType(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Room type "Phòng Cũ" already exists');
        }
    });

    it('Lỗi giá < 0', async () => {
        const newData = { name: 'Phòng Lỗi', base_price: -50 };
        RoomType.findOne.mockResolvedValue(null);

        console.log(`[TEST]: Tạo loại phòng có giá âm`);
        try {
            await RoomTypeService.createRoomType(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('base_price must be between 0 and 999,999,999,999');
        }
    });

    it('Lỗi capacity_min > capacity_max', async () => {
        const newData = { name: 'Phòng Thường', base_price: 100000, capacity_min: 5, capacity_max: 2 };
        RoomType.findOne.mockResolvedValue(null);

        console.log(`[TEST]: Tạo phòng capacity_min lớn hơn capacity_max`);
        try {
            await RoomTypeService.createRoomType(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('capacity_min must be <= capacity_max');
        }
    });

    it('Lỗi bedrooms vượt quá 10', async () => {
        const newData = { name: 'Phòng Siêu Khổng Lồ', base_price: 100, bedrooms: 50 };
        RoomType.findOne.mockResolvedValue(null);

        console.log(`[TEST]: Số phòng ngủ > 10`);
        try {
            await RoomTypeService.createRoomType(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('bedrooms must be between 1 and 10');
        }
    });
});
