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
        console.log('\n=========================================================================');
    });

    it('Lấy danh sách tất cả room types cho ADMIN với đầy đủ timestamp', async () => {
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
        console.log(`- Expected: 2 records returned, NO timestamp stripped in attributes`);
        
        expect(RoomType.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            attributes: undefined
        }));
        expect(result.data).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.active_count).toBe(1);
    });

    it('Lấy danh sách room types cho PUBLIC và strip timestamp', async () => {
        const query = { page: 1, limit: 10 };
        const user = { role: 'PUBLIC' };
        
        RoomType.findAndCountAll.mockResolvedValue({
            count: 2,
            rows: [{ id: 1, name: 'Phòng Đơn' }]
        });
        RoomType.count.mockResolvedValue(1);

        await RoomTypeService.getAllRoomTypes(query, user);

        console.log(`[TEST]: PUBLIC lấy danh sách RoomType`);
        console.log(`- Expected: attributes có exclude ['createdAt', 'updatedAt']`);

        expect(RoomType.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        }));
    });

    it('Filter danh sách theo is_active = true', async () => {
        const query = { is_active: 'true' };
        
        RoomType.findAndCountAll.mockResolvedValue({ count: 1, rows: [{}] });
        RoomType.count.mockResolvedValue(1);

        await RoomTypeService.getAllRoomTypes(query, {});

        console.log(`[TEST]: Lọc RoomType theo is_active=true`);
        expect(RoomType.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { is_active: true }
        }));
    });

    it('Tìm kiếm RoomType bằng chuỗi', async () => {
        const query = { search: 'VIP' };
        
        RoomType.findAndCountAll.mockResolvedValue({ count: 1, rows: [{}] });
        RoomType.count.mockResolvedValue(1);

        await RoomTypeService.getAllRoomTypes(query, {});

        console.log(`[TEST]: Lọc RoomType bằng search=VIP`);
        expect(RoomType.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { name: { [Op.iLike]: '%VIP%' } }
        }));
    });
});
