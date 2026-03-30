const RoomService = require('../../../services/room.service');
const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Room: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() },
        RoomImage: { bulkCreate: jest.fn(), destroy: jest.fn() },
        Booking: { findOne: jest.fn(), findAll: jest.fn() },
        Contract: { findOne: jest.fn(), findAll: jest.fn() },
        Building: { findByPk: jest.fn() },
        RoomType: { findByPk: jest.fn() },
        Request: { findAll: jest.fn() },
        AssetType: { findAll: jest.fn() },
        User: { findByPk: jest.fn() }
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
jest.mock('../../../models/roomImage.model', () => (require('../../../config/db').sequelize.models.RoomImage));
jest.mock('../../../models/booking.model', () => (require('../../../config/db').sequelize.models.Booking));
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));

const { Room, RoomImage, Booking, Contract } = sequelize.models;

describe('RoomService - updateRoom', () => {
    let mockTransaction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
        sequelize.transaction.mockResolvedValue(mockTransaction);
        
        // Mock getRoomById implementation to avoid toJSON error
        const mockRoomData = { id: 1, room_number: '102', building_id: 1 };
        Room.findByPk.mockResolvedValue({
            ...mockRoomData,
            toJSON: () => mockRoomData
        });
        Contract.findOne.mockResolvedValue(null);

        console.log('\n=========================================================================');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('TC_ROOM_09: Cập nhật phòng thành công không có ảnh (Happy Path)', async () => {
        const id = 1;
        const updateData = { room_number: '102', floor: 2 };
        const mockRoom = { 
            id, 
            building_id: 1, 
            room_number: '101', 
            update: jest.fn().mockResolvedValue(true)
        };

        // For the findByPk inside updateRoom
        Room.findByPk.mockResolvedValueOnce(mockRoom);
        
        Room.findOne.mockResolvedValue(null);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        const result = await RoomService.updateRoom(id, updateData);

        console.log(`[TEST]: Cập nhật phòng cơ bản`);
        console.log(`- Input   : ID=${id}, UpdateData=${JSON.stringify(updateData)}`);
        console.log(`- Expected: Gửi call update vào cơ sở dữ liệu`);

        expect(mockRoom.update).toHaveBeenCalledWith(updateData, expect.any(Object));
        expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('TC_ROOM_10: Lỗi cập nhật phòng không tồn tại (Abnormal)', async () => {
        Room.findByPk.mockResolvedValue(null);
        
        console.log(`[TEST]: Cập nhật ID không hợp lệ`);
        try {
            await RoomService.updateRoom(999, {});
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy phòng');
        }
    });

    it('TC_ROOM_11: Lỗi cập nhật trùng số phòng trong cùng tòa nhà (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        
        Room.findByPk.mockResolvedValue(mockRoom);
        Room.findOne.mockResolvedValue({ id: 2, room_number: '102' }); 
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        console.log(`[TEST]: Cập nhật phòng trùng số với phòng khác ở cùng tòa nhà`);
        try {
            await RoomService.updateRoom(id, { room_number: '102' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Số phòng 102 đã tồn tại trong tòa nhà này');
        }
    });

    it('TC_ROOM_12: Lỗi đổi building/room_type/number khi đang có đặt chỗ đang hoạt động (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue({ id: 10, status: 'PENDING' });

        console.log(`[TEST]: Thay đổi định danh (building/room_type/number) khi đang có đặt chỗ`);
        try {
            await RoomService.updateRoom(id, { building_id: 2 });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Không thể thay đổi tòa nhà, loại phòng hoặc số phòng khi phòng có đặt chỗ đang hoạt động');
        }
    });

    it('TC_ROOM_13: Lỗi đổi building/room_type/number khi đang có hợp đồng đang hoạt động (Abnormal)', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue({ id: 20, status: 'ACTIVE' });

        console.log(`[TEST]: Thay đổi định danh (building/room_type/number) khi đang có hợp đồng`);
        try {
            await RoomService.updateRoom(id, { room_number: '102' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Không thể thay đổi tòa nhà, loại phòng hoặc số phòng khi phòng có hợp đồng đang hoạt động');
        }
    });
});
