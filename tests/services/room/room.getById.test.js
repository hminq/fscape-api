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
        console.log('\n=========================================================================');
    });

    it('Lấy thông tin phòng công khai (PUBLIC), không có internal data', async () => {
        const id = 1;
        const mockRoom = { 
            id, building_id: 1, room_number: '101',
            created_at: '2023',
            building: { id: 1, name: 'A' },
            room_type: { id: 1, name: 'B', base_price: 100 },
            toJSON: () => ({ 
                id, building_id: 1, room_number: '101', 
                created_at: '2023',
                building: { id: 1, name: 'A', extra: 'hide' },
                room_type: { id: 1, name: 'B', base_price: 100, extra: 'hide' }
            })
        };
        Room.findByPk.mockResolvedValue(mockRoom);

        const result = await RoomService.getRoomById(id, { role: 'PUBLIC' });

        console.log(`[TEST]: PUBLIC xem phòng - Không internal data, stripping`);
        console.log(`- Expected: stripped fields (no extra, no created_at)`);
        
        expect(result.created_at).toBeUndefined();
        expect(result.building.extra).toBeUndefined();
        expect(result.current_resident).toBeUndefined();
    });

    it('Lấy thông tin cho ADMIN - thấy đầy đủ dữ liệu resident, booking, request', async () => {
        const id = 1;
        const mockRoom = { 
            id, building_id: 1, room_number: '101',
            toJSON: () => ({ id, building_id: 1, room_number: '101' })
        };
        const mockContract = {
            id: 10, status: 'ACTIVE', customer: { id: 5, first_name: 'John' },
            toJSON: () => ({ id: 10, status: 'ACTIVE', customer: { id: 5, first_name: 'John' } })
        };
        
        Room.findByPk.mockResolvedValue(mockRoom);
        Contract.findOne.mockResolvedValue(mockContract);
        Request.findAll.mockResolvedValue([{ id: 100, title: 'Fix AC' }]);
        Booking.findAll.mockResolvedValue([{ id: 200, status: 'PENDING' }]);
        Contract.findAll.mockResolvedValue([{ id: 300, term_type: 'LONG_TERM' }]);

        const result = await RoomService.getRoomById(id, { role: ROLES.ADMIN });

        console.log(`[TEST]: ADMIN xem chi tiết với dữ liệu bổ sung`);
        console.log(`- Expected: resident_requests.length=1, current_resident name="John"`);
        console.log(`- Actual  : ${result.resident_requests.length} request, name="${result.current_resident.first_name}"`);

        expect(result.current_resident).toBeDefined();
        expect(result.current_resident.first_name).toBe('John');
        expect(result.resident_requests).toHaveLength(1);
        expect(result.resident_bookings).toHaveLength(1);
        expect(result.resident_contracts).toHaveLength(1);
    });

    it('BUILDING_MANAGER truy cập phòng tòa nhà khác sẽ bị cấm', async () => {
        const id = 1;
        const mockRoom = { 
            id, building_id: 2, room_number: '101',
            toJSON: () => ({ id, building_id: 2, room_number: '101' })
        };
        Room.findByPk.mockResolvedValue(mockRoom);

        const expectedError = 'Bạn chỉ có thể xem phòng trong tòa nhà được phân công';

        try {
            await RoomService.getRoomById(id, { role: ROLES.BUILDING_MANAGER, building_id: 1 });
        } catch (error) {
            expect(error.status).toBe(403);
            expect(error.message).toBe(expectedError);
        }
    });

    it('ID phòng không tồn tại', async () => {
        Room.findByPk.mockResolvedValue(null);
        
        try {
            await RoomService.getRoomById(999, { role: 'PUBLIC' });
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy phòng');
        }
    });
});
