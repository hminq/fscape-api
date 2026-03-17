const RoomService = require('../../../services/room.service');
const Room = require('../../../models/room.model');
const RoomImage = require('../../../models/roomImage.model');
const Booking = require('../../../models/booking.model');
const Contract = require('../../../models/contract.model');
const Building = require('../../../models/building.model');
const RoomType = require('../../../models/roomType.model');
const { sequelize } = require('../../../config/db');

jest.mock('../../../models/room.model');
jest.mock('../../../models/roomImage.model');
jest.mock('../../../models/booking.model');
jest.mock('../../../models/contract.model');
jest.mock('../../../models/building.model');
jest.mock('../../../models/roomType.model');
jest.mock('../../../models/request.model');
jest.mock('../../../models/user.model');
// Remove manual db mock that overwrites sequelize.define

describe('RoomService - createRoom', () => {
    let mockTransaction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
        sequelize.transaction.mockResolvedValue(mockTransaction);
        console.log('\n=========================================================================');
    });

    it('Tạo phòng thành công không có ảnh', async () => {
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

    it('Tạo phòng thành công có ảnh', async () => {
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

        console.log(`[TEST]: Tạo phòng mới kèm ảnh gallery`);
        console.log(`- Input   : RoomNumber="${newData.room_number}", Images=${newData.gallery_images.length}`);
        console.log(`- Expected: RoomNumber="102", Images=[img1.png, img2.png]`);
        console.log(`- Actual  : RoomNumber="${result.room_number}", Images=[${result.images.join(', ')}]`);

        expect(result.room_number).toBe('102');
        expect(result.images).toEqual(gallery_images);
        expect(RoomImage.bulkCreate).toHaveBeenCalledTimes(1);
        expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('Trùng số phòng trong cùng tòa nhà', async () => {
        const newData = { building_id: 1, room_number: '101', floor: 1, room_type_id: 1 };
        Room.findOne.mockResolvedValue({ id: 5, room_number: '101', building_id: 1 });
        const expectedError = 'Room number 101 already exists in this building';

        console.log(`[TEST]: Trùng số phòng trong tòa nhà`);
        console.log(`- Input   : RoomNumber="101", BuildingID=1`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await RoomService.createRoom(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
            expect(Room.create).not.toHaveBeenCalled();
        }
    });

    it('Lỗi database rollback transaction', async () => {
        const newData = { building_id: 1, room_number: '105', floor: 1, room_type_id: 1 };
        Room.findOne.mockResolvedValue(null);
        Room.create.mockRejectedValue(new Error('DB Error'));

        console.log(`[TEST]: Database error - Transaction rollback`);
        console.log(`- Input   : RoomNumber="105", BuildingID=1`);
        console.log(`- Expected Error: "DB Error"`);

        try {
            await RoomService.createRoom(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe('DB Error');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        }
    });
});
