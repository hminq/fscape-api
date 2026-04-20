const RoomService = require('../../../services/room.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Room: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() },
        Booking: { findOne: jest.fn() },
        Contract: { findOne: jest.fn() },
        RoomImage: { bulkCreate: jest.fn(), destroy: jest.fn() },
        Building: { findByPk: jest.fn() },
        RoomType: { findByPk: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            transaction: jest.fn().mockResolvedValue({ 
                commit: jest.fn(), 
                rollback: jest.fn()
            }),
            authenticate: jest.fn().mockResolvedValue(),
            close: jest.fn().mockResolvedValue()
        },
        connectDB: jest.fn().mockResolvedValue()
    };
});

// Mock individual models
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/booking.model', () => (require('../../../config/db').sequelize.models.Booking));
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));

const { Room, Booking, Contract } = sequelize.models;

describe('RoomService - deleteRoom', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset trạng thái các model liên quan
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        console.log('\n=========================================================================');
    });

    it('TC_ROOM_01: Xóa phòng thành công (Happy Path)', async () => {
        const roomId = 1;
        const mockRoom = { id: roomId, room_number: '101', destroy: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        const result = await RoomService.deleteRoom(roomId);
        expect(result.message).toBe(`Đã xóa phòng 101 thành công`);
        expect(mockRoom.destroy).toHaveBeenCalled();
    });

    it('TC_ROOM_02: Lỗi khi xóa phòng không tồn tại (Abnormal)', async () => {
        const roomId = 999;
        Room.findByPk.mockResolvedValue(null);

        try {
            await RoomService.deleteRoom(roomId);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy phòng');
        }
    });

    it('TC_ROOM_03: Lỗi không thể xóa do có ràng buộc đang hoạt động (Abnormal)', async () => {
        const roomId = 1;
        const mockRoom = { id: roomId, room_number: '101', destroy: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue({ id: 10, status: 'PENDING' }); 

        try {
            await RoomService.deleteRoom(roomId);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(409);
            expect(error.message).toContain('đang hoạt động');
            expect(mockRoom.destroy).not.toHaveBeenCalled();
        }
    });
});
