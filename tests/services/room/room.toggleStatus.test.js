const RoomService = require('../../../services/room.service');
const Room = require('../../../models/room.model');
const Booking = require('../../../models/booking.model');
const Contract = require('../../../models/contract.model');
const { ROLES } = require('../../../constants/roles');
const { Op } = require('sequelize');

jest.mock('../../../models/room.model');
jest.mock('../../../models/booking.model');
jest.mock('../../../models/contract.model');

describe('RoomService - toggleRoomStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Đổi trạng thái thành công (AVAILABLE -> LOCKED)', async () => {
        const id = 1;
        const mockRoom = { id, room_number: '101', status: 'AVAILABLE', building_id: 1, save: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        const result = await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.ADMIN });

        console.log(`[TEST]: Khóa phòng thành công`);
        console.log(`- Expected status: LOCKED`);
        console.log(`- Actual status  : ${result.status}`);

        expect(result.status).toBe('LOCKED');
        expect(mockRoom.save).toHaveBeenCalled();
    });

    it('Đổi trạng thái thành công (LOCKED -> AVAILABLE)', async () => {
        const id = 1;
        const mockRoom = { id, room_number: '101', status: 'LOCKED', building_id: 1, save: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);

        const result = await RoomService.toggleRoomStatus(id, 'AVAILABLE', { role: ROLES.ADMIN });

        console.log(`[TEST]: Mở khóa phòng thành công`);
        console.log(`- Expected status: AVAILABLE`);
        console.log(`- Actual status  : ${result.status}`);

        expect(result.status).toBe('AVAILABLE');
        expect(mockRoom.save).toHaveBeenCalled();
    });

    it('Trạng thái khóa không hợp lệ', async () => {
        const id = 1;

        console.log(`[TEST]: Trạng thái không tồn tại "INVALID"`);
        try {
            await RoomService.toggleRoomStatus(id, 'INVALID', { role: ROLES.ADMIN });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Status must be AVAILABLE or LOCKED');
        }
    });

    it('ID phòng không tồn tại', async () => {
        const id = 999;
        Room.findByPk.mockResolvedValue(null);

        console.log(`[TEST]: Khóa phòng không tồn tại`);
        try {
            await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.ADMIN });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Room not found');
        }
    });

    it('BUILDING_MANAGER khóa phòng của tòa khác', async () => {
        const id = 1;
        const mockRoom = { id, status: 'AVAILABLE', building_id: 2, save: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);

        console.log(`[TEST]: MANAGER khóa phòng không thuộc quản lý`);
        try {
            await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.BUILDING_MANAGER, building_id: 1 });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(403);
            expect(error.message).toBe('You can only manage rooms in your assigned building');
        }
    });

    it('Không thể khóa vì trạng thái hiện tại đã là LOCKED', async () => {
        const id = 1;
        const mockRoom = { id, status: 'LOCKED', building_id: 1, save: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);

        console.log(`[TEST]: Phòng đã khóa`);
        try {
            await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.ADMIN });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Room is already LOCKED');
        }
    });

    it('Không thể khóa vì trạng thái hiện tại không phải là AVAILABLE (ví dụ OCCUPIED)', async () => {
        const id = 1;
        const mockRoom = { id, status: 'OCCUPIED', building_id: 1, save: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);

        console.log(`[TEST]: Phòng đã được thuê (OCCUPIED)`);
        try {
            await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.ADMIN });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Cannot lock a room with status OCCUPIED');
        }
    });

    it('Không thể khóa phòng vì có active booking', async () => {
        const id = 1;
        const mockRoom = { id, status: 'AVAILABLE', building_id: 1, save: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue({ id: 10, status: 'PENDING' });

        console.log(`[TEST]: Phòng đang có booking pending`);
        try {
            await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.ADMIN });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Cannot lock room with active bookings');
        }
    });

    it('Không thể khóa phòng vì có active contract', async () => {
        const id = 1;
        const mockRoom = { id, status: 'AVAILABLE', building_id: 1, save: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue({ id: 20, status: 'ACTIVE' });

        console.log(`[TEST]: Phòng đang có contract active`);
        try {
            await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.ADMIN });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Cannot lock room with active contracts');
        }
    });
});
