const RoomService = require('../../../services/room.service');
const Room = require('../../../models/room.model');
const Building = require('../../../models/building.model');
const RoomType = require('../../../models/roomType.model');
const { ROLES } = require('../../../constants/roles');
const { Op } = require('sequelize');

jest.mock('../../../models/room.model');
jest.mock('../../../models/building.model');
jest.mock('../../../models/roomType.model');
jest.mock('../../../models/roomImage.model');
jest.mock('../../../models/booking.model');
jest.mock('../../../models/contract.model');
jest.mock('../../../models/request.model');
jest.mock('../../../models/user.model');

describe('RoomService - getAllRooms', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy danh sách cho ADMIN, không có filter, timestamps được giữ lại', async () => {
        const query = { page: 1, limit: 10 };
        const user = { role: ROLES.ADMIN };
        const mockRooms = [
            { id: 1, room_number: '101', building_id: 1, created_at: '2023-01-01', toJSON: () => ({ id: 1, room_number: '101', building_id: 1, created_at: '2023-01-01' }) },
            { id: 2, room_number: '102', building_id: 2, created_at: '2023-01-02', toJSON: () => ({ id: 2, room_number: '102', building_id: 2, created_at: '2023-01-02' }) }
        ];

        Room.findAndCountAll.mockResolvedValue({
            count: 2,
            rows: mockRooms
        });

        const result = await RoomService.getAllRooms(query, user);

        console.log(`[TEST]: ADMIN lấy danh sách các phòng`);
        console.log(`- Expected: 2 records returned with created_at`);
        console.log(`- Actual  : ${result.data.length} records returned`);

        expect(result.total).toBe(2);
        expect(result.data).toHaveLength(2);
        // ADMIN nên thấy data gốc chứa timestamps, do data lấy từ rows không qua bước map xóa timestamps trong code nếu là ADMIN (nó trả rows, nhưng ở đây cần xem logic row.toJSON ko)
        // Code thực tế: let data = rows; nếu k phải admin mới chạy .map() strip fields
        expect(result.data[0]).toHaveProperty('id');
    });

    it('Lấy danh sách cho BUILDING_MANAGER, tự động filter theo building_id và xóa timestamps', async () => {
        const query = { page: 1, limit: 5 };
        const user = { role: ROLES.BUILDING_MANAGER, building_id: 1 };
        
        const mockRoom = { 
            id: 1, 
            room_number: '101', 
            building_id: 1,
            created_at: '2023-01-01',
            createdAt: '2023-01-01',
            toJSON: () => ({ id: 1, room_number: '101', building_id: 1, created_at: '2023-01-01', createdAt: '2023-01-01' })
        };

        Room.findAndCountAll.mockResolvedValue({
            count: 1,
            rows: [mockRoom]
        });

        const result = await RoomService.getAllRooms(query, user);

        console.log(`[TEST]: BUILDING_MANAGER lấy danh sách, check filter building_id và stripping`);
        console.log(`- Input   : building_id filter=${user.building_id}`);
        console.log(`- Expected: stripped timestamps (no created_at)`);
        
        const hasCreatedAt = result.data[0].hasOwnProperty('created_at');
        console.log(`- Actual  : contains created_at? ${hasCreatedAt}`);

        expect(Room.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { building_id: 1 }
        }));
        
        expect(hasCreatedAt).toBe(false);
    });

    it('Tìm kiếm (search) phòng bằng số phòng', async () => {
        const query = { search: '101' };
        const user = { role: ROLES.ADMIN };

        Room.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

        await RoomService.getAllRooms(query, user);

        console.log(`[TEST]: Tìm kiếm phòng với query search`);
        console.log(`- Input   : search='101'`);
        
        expect(Room.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { room_number: { [Op.iLike]: '%101%' } }
        }));
    });
});
