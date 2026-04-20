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
        // Mặc định trả về danh sách trống
        Room.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
        console.log('\n=========================================================================');
    });

    it('TC_ROOM_GET_01: ADMIN lấy danh sách các phòng (Full data & No filter)', async () => {
        const query = { page: 1, limit: 10 };
        const user = { role: ROLES.ADMIN };
        const mockRooms = [
            { 
                id: 1, room_number: '101', 
                createdAt: '2023-01-01', 
                toJSON: () => ({ id: 1, room_number: '101', createdAt: '2023-01-01' }) 
            }
        ];

        Room.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRooms });

        const result = await RoomService.getAllRooms(query, user);

        console.log(`[TEST]: ADMIN lấy danh sách - Check timestamps`);
        // ADMIN trả về rows trực tiếp, nên result.data[0] chính là mockRooms[0]
        expect(result.total).toBe(1);
        expect(result.data[0]).toHaveProperty('createdAt'); // Admin phải thấy timestamps
        expect(Room.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: {}, // Không bị auto-filter building
            limit: 10,
            offset: 0
        }));
    });

    it('TC_ROOM_GET_02: MANAGER lấy danh sách - Tự động lọc theo Building và ẩn thông tin nhạy cảm', async () => {
        const query = { page: 1, limit: 10 };
        const user = { role: ROLES.BUILDING_MANAGER, building_id: 88 };
        
        const mockRoom = { 
            id: 1, room_number: '101', 
            createdAt: '2023-01-01',
            toJSON: () => ({ id: 1, room_number: '101', createdAt: '2023-01-01' })
        };

        Room.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockRoom] });

        const result = await RoomService.getAllRooms(query, user);

        console.log(`[TEST]: Manager lấy danh sách - Check auto-filter building_id và stripping`);
        
        // Kiểm tra filter tòa nhà
        expect(Room.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { building_id: 88 }
        }));
        
        // Kiểm tra việc ẩn createdAt
        expect(result.data[0]).not.toHaveProperty('createdAt');
    });

    it('TC_ROOM_GET_03: Tìm kiếm và lọc nâng cao (Search, Status, Floor)', async () => {
        const query = { search: '101', status: 'AVAILABLE', floor: 2 };
        const user = { role: ROLES.ADMIN };

        await RoomService.getAllRooms(query, user);

        console.log(`[TEST]: Lọc nâng cao kết hợp search`);
        
        expect(Room.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                room_number: { [Op.iLike]: '%101%' },
                status: 'AVAILABLE',
                floor: 2
            })
        }));
    });

    it('TC_ROOM_GET_04: Kiểm tra phân trang (Pagination logic)', async () => {
        const query = { page: 3, limit: 5 };
        const user = { role: ROLES.ADMIN };

        await RoomService.getAllRooms(query, user);

        console.log(`[TEST]: Kiểm tra offset phân trang`);
        // Page 3, limit 5 -> Offset = (3-1)*5 = 10
        expect(Room.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            limit: 5,
            offset: 10
        }));
    });
});
