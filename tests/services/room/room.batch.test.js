const RoomService = require('../../../services/room.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Room: { bulkCreate: jest.fn() },
        RoomImage: { bulkCreate: jest.fn() },
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
        }
    };
});

const { Room, RoomImage, Building, RoomType } = sequelize.models;

describe('RoomService - createBatchRooms', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('TC_ROOM_01: Tạo phòng hàng loạt thành công (Happy Path)', async () => {
        const payload = {
            building_id: 1,
            room_type_id: 1,
            floor: 3,
            count: 2,
            gallery_images: ['img1.jpg']
        };

        Building.findByPk.mockResolvedValue({ id: 1, name: 'Building A' });
        RoomType.findByPk.mockResolvedValue({ id: 1, name: 'Type A' });
        Room.bulkCreate.mockResolvedValue([{ id: 101 }, { id: 102 }]);

        const result = await RoomService.createBatchRooms(payload);

        expect(result.count).toBe(2);
        expect(Room.bulkCreate).toHaveBeenCalled();
        expect(RoomImage.bulkCreate).toHaveBeenCalled();
    });

    it('TC_ROOM_02: Lỗi không tìm thấy tòa nhà (Abnormal)', async () => {
        Building.findByPk.mockResolvedValue(null);
        try {
            await RoomService.createBatchRooms({ building_id: 999 });
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy tòa nhà');
        }
    });

    it('TC_ROOM_03: Lỗi không tìm thấy loại phòng (Abnormal)', async () => {
        Building.findByPk.mockResolvedValue({ id: 1 });
        RoomType.findByPk.mockResolvedValue(null);
        try {
            await RoomService.createBatchRooms({ building_id: 1, room_type_id: 999 });
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy loại phòng');
        }
    });

    it('TC_ROOM_04: Lỗi hệ thống khi bulkCreate (Rollback) (Abnormal)', async () => {
        Building.findByPk.mockResolvedValue({ id: 1 });
        RoomType.findByPk.mockResolvedValue({ id: 1 });
        Room.bulkCreate.mockRejectedValue(new Error('DB Error'));

        try {
            await RoomService.createBatchRooms({ building_id: 1, room_type_id: 1, count: 5 });
        } catch (error) {
            expect(sequelize.transaction().rollback).toHaveBeenCalled;
        }
    });
});
