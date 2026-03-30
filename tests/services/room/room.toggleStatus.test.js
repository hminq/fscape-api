const RoomService = require('../../../services/room.service');
const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

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

describe('RoomService - toggleRoomStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('TC_ROOM_14: Đổi trạng thái thành công (AVAILABLE -> LOCKED) (Happy Path)', async () => {
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

    it('TC_ROOM_15: Đổi trạng thái thành công (LOCKED -> AVAILABLE) (Happy Path)', async () => {
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

    it('TC_ROOM_16: Lỗi trạng thái không hợp lệ (Abnormal)', async () => {
        const id = 1;
        console.log(`[TEST]: Trạng thái không hợp lệ "INVALID"`);
        try {
            await RoomService.toggleRoomStatus(id, 'INVALID', { role: ROLES.ADMIN });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Trạng thái phải là AVAILABLE hoặc LOCKED');
        }
    });

    it('TC_ROOM_17: Lỗi phòng không tồn tại (Abnormal)', async () => {
        const id = 999;
        Room.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Phòng không tồn tại`);
        try {
            await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.ADMIN });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy phòng');
        }
    });

    it('TC_ROOM_18: BUILDING_MANAGER không có quyền trên tòa nhà khác (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, status: 'AVAILABLE', building_id: 2, save: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);

        console.log(`[TEST]: MANAGER khóa phòng không thuộc quản lý`);
        try {
            await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.BUILDING_MANAGER, building_id: 1 });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(403);
            expect(error.message).toBe('Bạn chỉ có thể quản lý phòng trong tòa nhà được phân công');
        }
    });

    it('TC_ROOM_19: Lỗi phòng đã ở trạng thái mục tiêu (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, status: 'LOCKED', building_id: 1, save: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);

        console.log(`[TEST]: Phòng đã ở trạng thái LOCKED`);
        try {
            await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.ADMIN });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Phòng đã ở trạng thái LOCKED');
        }
    });

    it('TC_ROOM_20: Lỗi không thể khóa khi đang có đặt chỗ/hợp đồng (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, status: 'AVAILABLE', building_id: 1, save: jest.fn() };
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue({ id: 10, status: 'PENDING' });

        console.log(`[TEST]: Khóa phòng đang có đặt chỗ hoạt động`);
        try {
            await RoomService.toggleRoomStatus(id, 'LOCKED', { role: ROLES.ADMIN });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Không thể khóa phòng có đặt chỗ đang hoạt động');
        }
    });
});
