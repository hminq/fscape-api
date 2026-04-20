const RoomTypeService = require('../../../services/roomType.service');
const RoomType = require('../../../models/roomType.model');
const { ROLES } = require('../../../constants/roles');
const { Op } = require('sequelize');

jest.mock('../../../models/roomType.model');
jest.mock('../../../models/room.model');
jest.mock('../../../models/roomTypeAsset.model');
jest.mock('../../../models/assetType.model');

describe('RoomTypeService - getAllRoomTypes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        RoomType.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
        RoomType.count.mockResolvedValue(0);
        console.log('\n=========================================================================');
    });

    it('TC_ROOMTYPE_GET_01: ADMIN lấy danh sách các loại phòng (Full data)', async () => {
        const query = { page: 1, limit: 10 };
        const user = { role: ROLES.ADMIN };
        
        RoomType.findAndCountAll.mockResolvedValue({
            count: 2,
            rows: [
                { id: 1, name: 'Phòng Đơn' },
                { id: 2, name: 'Phòng Đôi' }
            ]
        });
        RoomType.count.mockResolvedValue(1);

        const result = await RoomTypeService.getAllRoomTypes(query, user);

        console.log(`[TEST]: ADMIN lấy danh sách RoomType`);
        
        expect(RoomType.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            attributes: undefined
        }));
        expect(result.data).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.active_count).toBe(1);
    });

    it('TC_ROOMTYPE_GET_02: PUBLIC lấy danh sách - Ẩn thông tin nhạy cảm', async () => {
        const query = { page: 1, limit: 10 };
        const user = { role: 'PUBLIC' };
        
        RoomType.findAndCountAll.mockResolvedValue({
            count: 1,
            rows: [{ id: 1, name: 'Phòng Đơn' }]
        });
        RoomType.count.mockResolvedValue(1);

        await RoomTypeService.getAllRoomTypes(query, user);

        console.log(`[TEST]: PUBLIC lấy danh sách RoomType - Kiểm tra stripping`);

        expect(RoomType.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        }));
    });

    it('TC_ROOMTYPE_GET_03: Lọc theo trạng thái is_active', async () => {
        const query = { is_active: 'true' };
        
        await RoomTypeService.getAllRoomTypes(query, {});

        console.log(`[TEST]: Lọc RoomType theo is_active=true`);
        expect(RoomType.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { is_active: true }
        }));
    });

    it('TC_ROOMTYPE_GET_04: Tìm kiếm theo tên (Search)', async () => {
        const query = { search: 'VIP' };
        
        await RoomTypeService.getAllRoomTypes(query, {});

        console.log(`[TEST]: Lọc RoomType bằng search=VIP`);
        expect(RoomType.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { name: { [Op.iLike]: '%VIP%' } }
        }));
    });
});
