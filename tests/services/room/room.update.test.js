const RoomService = require('../../../services/room.service');
const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

// 1. Mock Database & Models
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

// Mock individual models to ensure they point to the same mocked model objects
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/roomImage.model', () => (require('../../../config/db').sequelize.models.RoomImage));
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));
jest.mock('../../../models/booking.model', () => (require('../../../config/db').sequelize.models.Booking));
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));

const { Room, Booking, Contract } = sequelize.models;

describe('RoomService - updateRoom', () => {
    let mockTransaction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
        sequelize.transaction.mockResolvedValue(mockTransaction);
        
        // Mặc định là tìm thấy để tránh lỗi 404 không mong muốn
        sequelize.models.Building.findByPk.mockResolvedValue({ id: 1, name: 'Building A' });
        sequelize.models.RoomType.findByPk.mockResolvedValue({ id: 1, name: 'Type A' });

        // Reset các mock có khả năng gây rò rỉ trạng thái
        Room.findOne.mockResolvedValue(null);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        console.log('\n=========================================================================');
    });

    it('TC_ROOM_01: Cập nhật thông tin phụ thành công (Không đổi định danh) (Happy Path)', async () => {
        const id = 1;
        const updateData = { floor: 5 }; // Chỉ update tầng
        const mockRoom = { 
            id, building_id: 1, room_number: '101', floor: 1,
            update: jest.fn().mockResolvedValue(true),
            toJSON: jest.fn().mockReturnValue({ id, building_id: 1, room_number: '101', floor: 5 })
        };

        Room.findByPk.mockResolvedValue(mockRoom);

        await RoomService.updateRoom(id, updateData);
        expect(mockRoom.update).toHaveBeenCalledWith(updateData, expect.any(Object));
        expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('TC_ROOM_02: Cập nhật định danh thành công (Khi không có ràng buộc) (Happy Path)', async () => {
        const id = 1;
        const updateData = { room_number: '102' };
        const mockRoom = { 
            id, building_id: 1, room_number: '101', 
            update: jest.fn().mockResolvedValue(true),
            toJSON: jest.fn().mockReturnValue({ id, building_id: 1, room_number: '102' })
        };

        Room.findByPk.mockResolvedValue(mockRoom);
        Room.findOne.mockResolvedValue(null);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        await RoomService.updateRoom(id, updateData);
        expect(mockRoom.update).toHaveBeenCalledWith(updateData, expect.any(Object));
    });

    it('TC_ROOM_03: Lỗi cập nhật phòng không tồn tại (Abnormal)', async () => {
        Room.findByPk.mockResolvedValue(null);
        try {
            await RoomService.updateRoom(999, {});
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy phòng');
            expect(mockTransaction.rollback).not.toHaveBeenCalled();
        }
    });

    it('TC_ROOM_04: Lỗi cập nhật trùng số phòng trong cùng tòa nhà (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        Room.findByPk.mockResolvedValue(mockRoom);
        Room.findOne.mockResolvedValue({ id: 2, room_number: '102' }); 

        try {
            await RoomService.updateRoom(id, { room_number: '102' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(409);
            expect(error.message).toBe('Số phòng 102 đã tồn tại trong tòa nhà này');
        }
    });

    it('TC_ROOM_05: Lỗi tòa nhà đích không tồn tại (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        Room.findByPk.mockResolvedValue(mockRoom);
        sequelize.models.Building.findByPk.mockResolvedValue(null);

        try {
            await RoomService.updateRoom(id, { building_id: 999 });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy tòa nhà');
        }
    });

    it('TC_ROOM_06: Lỗi loại phòng đích không tồn tại (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        Room.findByPk.mockResolvedValue(mockRoom);
        sequelize.models.RoomType.findByPk.mockResolvedValue(null);

        try {
            await RoomService.updateRoom(id, { room_type_id: 999 });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy loại phòng');
        }
    });

    it('TC_ROOM_07: Lỗi số phòng không được để trống (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        Room.findByPk.mockResolvedValue(mockRoom);

        try {
            await RoomService.updateRoom(id, { room_number: '' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toBe('Số phòng không được để trống');
        }
    });

    it('TC_ROOM_08: Lỗi đổi định danh khi đang có đặt chỗ/hợp đồng (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue({ id: 10 });

        try {
            await RoomService.updateRoom(id, { room_number: '102' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(409);
            expect(error.message).toContain('đang hoạt động');
        }
    });

    it('TC_ROOM_09: Lỗi hệ thống - Transaction rollback (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { 
            id, building_id: 1, room_number: '101',
            update: jest.fn().mockRejectedValue(new Error('Database error'))
        };
        Room.findByPk.mockResolvedValue(mockRoom);

        try {
            await RoomService.updateRoom(id, { floor: 10 });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.message).toBe('Database error');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        }
    });
});
