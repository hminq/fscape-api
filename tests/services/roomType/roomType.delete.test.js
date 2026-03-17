const RoomTypeService = require('../../../services/roomType.service');
const RoomType = require('../../../models/roomType.model');
const Room = require('../../../models/room.model');

jest.mock('../../../models/roomType.model');
jest.mock('../../../models/room.model');
jest.mock('../../../models/roomTypeAsset.model');
jest.mock('../../../models/assetType.model');

describe('RoomTypeService - deleteRoomType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Xóa loại phòng hợp lệ', async () => {
        const id = 1;
        const mockRoomType = { id, name: 'Phòng Thường', destroy: jest.fn() };

        RoomType.findByPk.mockResolvedValue(mockRoomType);
        Room.count.mockResolvedValue(0); // Không có phòng nào đang dùng

        const result = await RoomTypeService.deleteRoomType(id);

        console.log(`[TEST]: Xóa RoomType không có Room nào refer`);
        expect(mockRoomType.destroy).toHaveBeenCalled();
        expect(result.message).toBe('Room type "Phòng Thường" deleted successfully');
    });

    it('Lỗi: RoomType không tồn tại', async () => {
        const id = 999;
        RoomType.findByPk.mockResolvedValue(null);

        console.log(`[TEST]: Xóa ID RoomType không tồn tại`);
        try {
            await RoomTypeService.deleteRoomType(id);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Room type not found');
        }
    });

    it('Lỗi: Đang có Room linked (ràng buộc toàn vẹn)', async () => {
        const id = 1;
        const mockRoomType = { id, name: 'Phòng VIP' };
        
        RoomType.findByPk.mockResolvedValue(mockRoomType);
        Room.count.mockResolvedValue(3); // Đang có 3 phòng tham chiếu tới room_type_id=1

        console.log(`[TEST]: Xóa RoomType đang được dùng bởi 3 Room`);
        try {
            await RoomTypeService.deleteRoomType(id);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Cannot delete room type because 3 room(s) still use it');
        }
    });
});
