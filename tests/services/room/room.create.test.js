const RoomService = require('../../../services/room.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Room: { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn() },
        RoomImage: { bulkCreate: jest.fn(), destroy: jest.fn() },
        Booking: { findOne: jest.fn() },
        Contract: { findOne: jest.fn() },
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

const { Room, RoomImage } = sequelize.models;

describe('RoomService - createRoom', () => {
    let mockTransaction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
        sequelize.transaction.mockResolvedValue(mockTransaction);
        console.log('\n=========================================================================');
    });

    it('TC_ROOM_01: Tạo phòng thành công không có ảnh (Happy Path)', async () => {
        const newData = { building_id: 1, room_number: '101', floor: 1, room_type_id: 1 };
        Room.findOne.mockResolvedValue(null);
        Room.create.mockResolvedValue({ id: 1, ...newData });
        
        Room.findByPk.mockResolvedValue({
            id: 1, ...newData,
            toJSON: () => ({ id: 1, ...newData })
        });

        const result = await RoomService.createRoom(newData);

        console.log(`[TEST]: Tạo phòng mới`);
        console.log(`- Input   : RoomNumber="${newData.room_number}", BuildingID=${newData.building_id}`);
        console.log(`- Expected: RoomNumber="101"`);
        console.log(`- Actual  : RoomNumber="${result.room_number}"`);

        expect(result.room_number).toBe('101');
        expect(RoomImage.bulkCreate).not.toHaveBeenCalled();
        expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('TC_ROOM_02: Tạo phòng thành công có ảnh (Happy Path)', async () => {
        const newData = { 
            building_id: 1, 
            room_number: '102', 
            floor: 1, 
            room_type_id: 1,
            gallery_images: ['img1.png', 'img2.png']
        };
        const { gallery_images, ...roomData } = newData;
        Room.findOne.mockResolvedValue(null);
        Room.create.mockResolvedValue({ id: 1, ...roomData });
        
        RoomImage.bulkCreate.mockResolvedValue(true);
        Room.findByPk.mockResolvedValue({
            id: 1, ...roomData,
            images: [{ image_url: 'img1.png' }, { image_url: 'img2.png' }],
            toJSON: () => ({ 
                id: 1, ...roomData, 
                images: [{ image_url: 'img1.png' }, { image_url: 'img2.png' }] 
            })
        });

        const result = await RoomService.createRoom(newData);

        expect(result.room_number).toBe('102');
        expect(result.images).toEqual(gallery_images);
        expect(RoomImage.bulkCreate).toHaveBeenCalledTimes(1);
        expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('TC_ROOM_03: Lỗi trùng số phòng trong cùng tòa nhà (Abnormal)', async () => {
        const newData = { building_id: 1, room_number: '101', floor: 1, room_type_id: 1 };
        Room.findOne.mockResolvedValue({ id: 5, room_number: '101', building_id: 1 });

        console.log(`[TEST]: Trùng số phòng trong tòa nhà`);
        try {
            await RoomService.createRoom(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Số phòng 101 đã tồn tại trong tòa nhà này');
            expect(Room.create).not.toHaveBeenCalled();
        }
    });

    it('TC_ROOM_04: Lỗi database rollback transaction (Abnormal)', async () => {
        const newData = { building_id: 1, room_number: '105', floor: 1, room_type_id: 1 };
        Room.findOne.mockResolvedValue(null);
        Room.create.mockRejectedValue(new Error('DB Error'));

        console.log(`[TEST]: Database error - Transaction rollback`);
        try {
            await RoomService.createRoom(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe('DB Error');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        }
    });
});
