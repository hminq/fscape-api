const RoomTypeService = require('../../../services/roomType.service');
const RoomType = require('../../../models/roomType.model');
const { Op } = require('sequelize');

jest.mock('../../../models/roomType.model');
jest.mock('../../../models/room.model');
jest.mock('../../../models/roomTypeAsset.model');
jest.mock('../../../models/assetType.model');

describe('RoomTypeService - updateRoomType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Cập nhật loại phòng thành công', async () => {
        const id = 1;
        const updateData = { name: 'Phòng Mới VIP', base_price: 2500000 };
        const mockRoomType = { id, name: 'Phòng Cũ', capacity_min: 1, capacity_max: 2, update: jest.fn() };

        RoomType.findByPk.mockResolvedValue(mockRoomType);
        RoomType.findOne.mockResolvedValue(null);

        await RoomTypeService.updateRoomType(id, updateData);

        console.log(`[TEST]: Cập nhật thông tin loại phòng hợp lệ`);
        expect(mockRoomType.update).toHaveBeenCalledWith(updateData);
    });

    it('Lỗi cập nhật: Room Type không tồn tại', async () => {
        const id = 999;
        RoomType.findByPk.mockResolvedValue(null);

        console.log(`[TEST]: Cập nhật ID loại phòng không tồn tại`);
        try {
            await RoomTypeService.updateRoomType(id, {});
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Room type not found');
        }
    });

    it('Lỗi cập nhật trùng tên loại phòng khác', async () => {
        const id = 1;
        const mockRoomType = { id, name: 'Phòng Thường' };
        RoomType.findByPk.mockResolvedValue(mockRoomType);
        RoomType.findOne.mockResolvedValue({ id: 2, name: 'Phòng VIP Mới' });

        console.log(`[TEST]: Cập nhật đổi tên sang tên đã tồn tại`);
        try {
            await RoomTypeService.updateRoomType(id, { name: 'Phòng VIP Mới' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Room type "Phòng VIP Mới" already exists');
        }
    });

    it('Ngăn chặn thay đổi deposit_months', async () => {
        const id = 1;
        const mockRoomType = { id, name: 'Phòng VIP', capacity_min: 1, capacity_max: 2, update: jest.fn() };
        RoomType.findByPk.mockResolvedValue(mockRoomType);

        await RoomTypeService.updateRoomType(id, { deposit_months: 5, base_price: 50 });

        console.log(`[TEST]: Gửi lên deposit_months=5 sẽ bị xóa khỏi data update`);
        expect(mockRoomType.update).toHaveBeenCalledWith(expect.objectContaining({
            base_price: 50
        }));
        expect(mockRoomType.update).not.toHaveBeenCalledWith(expect.objectContaining({
            deposit_months: 5
        }));
    });

    it('Lỗi cập nhật capacity_min > capacity_max (do sử dụng data cũ)', async () => {
        const id = 1;
        // Room đã có min=2, max=4
        const mockRoomType = { id, capacity_min: 2, capacity_max: 4 };
        RoomType.findByPk.mockResolvedValue(mockRoomType);

        console.log(`[TEST]: Cập nhật min_capacity nhưng vượt quá max_capacity cũ`);
        try {
            await RoomTypeService.updateRoomType(id, { capacity_min: 6 });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('capacity_min must be <= capacity_max');
        }
    });
});
