const RoomTypeService = require('../../../services/roomType.service');
const RoomType = require('../../../models/roomType.model');
const { ROLES } = require('../../../constants/roles');

jest.mock('../../../models/roomType.model');
jest.mock('../../../models/room.model');
jest.mock('../../../models/roomTypeAsset.model');
jest.mock('../../../models/assetType.model');

describe('RoomTypeService - getRoomTypeById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        RoomType.findByPk.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_ROOM_TYPE_01: PUBLIC lấy chi tiết loại phòng (Ẩn Timestamp)', async () => {
        const id = 1;
        RoomType.findByPk.mockResolvedValue({ id, name: 'Phòng Đơn' });

        await RoomTypeService.getRoomTypeById(id, { role: 'PUBLIC' });

        console.log(`[TEST]: PUBLIC lấy chi tiết RoomType`);
        expect(RoomType.findByPk).toHaveBeenCalledWith(id, expect.objectContaining({
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        }));
    });

    it('TC_ROOM_TYPE_02: ADMIN lấy chi tiết loại phòng (Full data)', async () => {
        const id = 1;
        RoomType.findByPk.mockResolvedValue({ id, name: 'Phòng Đơn' });

        const result = await RoomTypeService.getRoomTypeById(id, { role: ROLES.ADMIN });

        console.log(`[TEST]: ADMIN lấy chi tiết RoomType`);
        expect(RoomType.findByPk).toHaveBeenCalledWith(id, expect.objectContaining({
            attributes: undefined
        }));
        expect(result.name).toBe('Phòng Đơn');
    });

    it('TC_ROOM_TYPE_03: Lỗi khi loại phòng không tồn tại (404)', async () => {
        const id = 999;
        RoomType.findByPk.mockResolvedValue(null);

        console.log(`[TEST]: Lấy chi tiết ID không tồn tại`);
        try {
            await RoomTypeService.getRoomTypeById(id, { role: 'PUBLIC' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy loại phòng');
        }
    });
});
