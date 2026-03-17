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
        console.log('\n=========================================================================');
    });

    it('Lấy thông tin cho PUBLIC - Không kèm timestamp', async () => {
        const id = 1;
        RoomType.findByPk.mockResolvedValue({ id, name: 'Phòng Đơn' });

        await RoomTypeService.getRoomTypeById(id, { role: 'PUBLIC' });

        console.log(`[TEST]: PUBLIC lấy chi tiết RoomType`);
        expect(RoomType.findByPk).toHaveBeenCalledWith(id, {
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
    });

    it('Lấy thông tin cho ADMIN - Đầy đủ trường', async () => {
        const id = 1;
        RoomType.findByPk.mockResolvedValue({ id, name: 'Phòng Đơn' });

        const result = await RoomTypeService.getRoomTypeById(id, { role: ROLES.ADMIN });

        console.log(`[TEST]: ADMIN lấy chi tiết RoomType`);
        expect(RoomType.findByPk).toHaveBeenCalledWith(id, {
            attributes: undefined
        });
        expect(result.name).toBe('Phòng Đơn');
    });

    it('Lỗi: RoomType không tồn tại', async () => {
        const id = 999;
        RoomType.findByPk.mockResolvedValue(null);

        console.log(`[TEST]: Lấy chi tiết ID không tồn tại`);
        try {
            await RoomTypeService.getRoomTypeById(id, { role: 'PUBLIC' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Room type not found');
        }
    });
});
