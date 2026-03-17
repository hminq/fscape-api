const RoomService = require('../../../services/room.service');
const Room = require('../../../models/room.model');
const Booking = require('../../../models/booking.model');
const Contract = require('../../../models/contract.model');
const { Op } = require('sequelize');

jest.mock('../../../models/room.model');
jest.mock('../../../models/booking.model');
jest.mock('../../../models/contract.model');
jest.mock('../../../models/roomImage.model');
jest.mock('../../../models/building.model');
jest.mock('../../../models/roomType.model');
jest.mock('../../../models/request.model');
jest.mock('../../../models/user.model');

describe('RoomService - deleteRoom', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Xóa phòng thành công không có active bookings hoặc contracts', async () => {
        const roomId = 1;
        const mockRoom = { id: roomId, room_number: '101', destroy: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        const result = await RoomService.deleteRoom(roomId);

        console.log(`[TEST]: Xóa phòng hợp lệ`);
        console.log(`- Input   : RoomID=${roomId}`);
        console.log(`- Expected: Room ${mockRoom.room_number} deleted successfully`);
        console.log(`- Actual  : ${result.message}`);

        expect(result.message).toBe(`Room ${mockRoom.room_number} deleted successfully`);
        expect(mockRoom.destroy).toHaveBeenCalled();
    });

    it('Id phòng không tồn tại', async () => {
        const roomId = 999;
        Room.findByPk.mockResolvedValue(null);
        const expectedError = 'Room not found';

        console.log(`[TEST]: Xóa ID không tồn tại`);
        console.log(`- Input   : RoomID=${roomId}`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await RoomService.deleteRoom(roomId);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe(expectedError);
            expect(Booking.findOne).not.toHaveBeenCalled();
            expect(Contract.findOne).not.toHaveBeenCalled();
        }
    });

    it('Không thể xóa do có active booking', async () => {
        const roomId = 1;
        const mockRoom = { id: roomId, room_number: '101', destroy: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue({ id: 10, status: 'PENDING' });
        const expectedError = 'Cannot delete room with active bookings';

        console.log(`[TEST]: Xóa phòng đang có booking`);
        console.log(`- Input   : RoomID=${roomId}`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await RoomService.deleteRoom(roomId);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
            expect(mockRoom.destroy).not.toHaveBeenCalled();
        }
    });

    it('Không thể xóa do có active contract', async () => {
        const roomId = 1;
        const mockRoom = { id: roomId, room_number: '101', destroy: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue({ id: 20, status: 'ACTIVE' });
        const expectedError = 'Cannot delete room with active contracts';

        console.log(`[TEST]: Xóa phòng đang có hợp đồng`);
        console.log(`- Input   : RoomID=${roomId}`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await RoomService.deleteRoom(roomId);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
            expect(mockRoom.destroy).not.toHaveBeenCalled();
        }
    });
});
