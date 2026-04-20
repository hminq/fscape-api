const RoomService = require('../../../services/room.service');
const Room = require('../../../models/room.model');
const Contract = require('../../../models/contract.model');
const Request = require('../../../models/request.model');
const Booking = require('../../../models/booking.model');
const { ROLES } = require('../../../constants/roles');

jest.mock('../../../models/room.model');
jest.mock('../../../models/building.model');
jest.mock('../../../models/roomType.model');
jest.mock('../../../models/roomImage.model');
jest.mock('../../../models/booking.model');
jest.mock('../../../models/contract.model');
jest.mock('../../../models/request.model');
jest.mock('../../../models/user.model');

describe('RoomService - getRoomById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Room.findByPk.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);
        Request.findAll.mockResolvedValue([]);
        Booking.findAll.mockResolvedValue([]);
        Contract.findAll.mockResolvedValue([]);
        
        console.log('\n=========================================================================');
    });

    it('TC_ROOM_GT_01: Lấy thông tin phòng công khai (PUBLIC) - Ẩn thông tin nhạy cảm', async () => {
        const id = 1;
        const mockRoom = { 
            id, building_id: 1, room_number: '101',
            createdAt: '2023-01-01',
            building: { id: 1, name: 'A', address: 'Add A' },
            room_type: { id: 1, name: 'B', base_price: 100 },
            toJSON: () => ({ 
                id, building_id: 1, room_number: '101', 
                createdAt: '2023-01-01',
                building: { id: 1, name: 'A', address: 'Add A' },
                room_type: { id: 1, name: 'B', base_price: 100 }
            })
        };
        Room.findByPk.mockResolvedValue(mockRoom);

        const result = await RoomService.getRoomById(id, { role: 'PUBLIC' });

        console.log(`[TEST]: PUBLIC xem phòng - Không internal data, stripping`);
        
        expect(result.createdAt).toBeUndefined(); // Ẩn timestamps
        expect(result.current_resident).toBeUndefined(); // Không thấy resident
        expect(result.building).not.toHaveProperty('created_at');
    });

    it('TC_ROOM_GT_02: Lấy thông tin cho ADMIN - Thấy đầy đủ dữ liệu cư dân và các yêu cầu liên quan', async () => {
        const id = 1;
        const mockRoom = { 
            id, building_id: 1, room_number: '101',
            toJSON: () => ({ id, building_id: 1, room_number: '101' })
        };
        const mockContract = {
            id: 10, status: 'ACTIVE', 
            customer: { id: 5, first_name: 'John' },
            toJSON: () => ({ id: 10, status: 'ACTIVE', customer: { id: 5, first_name: 'John' } })
        };
        
        Room.findByPk.mockResolvedValue(mockRoom);
        Contract.findOne.mockResolvedValue(mockContract);
        Request.findAll.mockResolvedValue([{ id: 100, title: 'Fix AC' }]);
        Booking.findAll.mockResolvedValue([{ id: 200, status: 'PENDING' }]);
        Contract.findAll.mockResolvedValue([{ id: 300, term_type: 'LONG_TERM' }]);

        const result = await RoomService.getRoomById(id, { role: ROLES.ADMIN });

        console.log(`[TEST]: ADMIN xem chi tiết với dữ liệu bổ sung`);
        
        expect(result.current_resident).toBeDefined();
        expect(result.current_resident.first_name).toBe('John');
        expect(result.resident_requests).toHaveLength(1);
        expect(result.resident_bookings).toHaveLength(1);
        expect(result.resident_contracts).toHaveLength(1);
    });

    it('TC_ROOM_GT_03: BUILDING_MANAGER truy cập phòng tòa nhà khác sẽ bị cấm (403)', async () => {
        const id = 1;
        const mockRoom = { 
            id, building_id: 2, room_number: '101',
            toJSON: () => ({ id, building_id: 2, room_number: '101' })
        };
        Room.findByPk.mockResolvedValue(mockRoom);

        const expectedError = 'Bạn chỉ có thể xem phòng trong tòa nhà được phân công';

        try {
            await RoomService.getRoomById(id, { role: ROLES.BUILDING_MANAGER, building_id: 1 });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(403);
            expect(error.message).toBe(expectedError);
        }
    });

    it('TC_ROOM_GT_04: ID phòng không tồn tại (404)', async () => {
        Room.findByPk.mockResolvedValue(null);
        
        try {
            await RoomService.getRoomById(999, { role: 'PUBLIC' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy phòng');
        }
    });
});
