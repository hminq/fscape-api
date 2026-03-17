const RoomService = require('../../../services/room.service');
const Room = require('../../../models/room.model');
const RoomImage = require('../../../models/roomImage.model');
const Booking = require('../../../models/booking.model');
const Contract = require('../../../models/contract.model');
const { sequelize } = require('../../../config/db');

jest.mock('../../../models/room.model');
jest.mock('../../../models/roomImage.model');
jest.mock('../../../models/booking.model');
jest.mock('../../../models/contract.model');
jest.mock('../../../models/building.model');
jest.mock('../../../models/roomType.model');
jest.mock('../../../models/request.model');
jest.mock('../../../models/user.model');
// removed broken config/db mock

describe('RoomService - updateRoom', () => {
    let mockTransaction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
        sequelize.transaction.mockResolvedValue(mockTransaction);
        
        // Mock getRoomById called at the end of successful update
        jest.spyOn(RoomService, 'getRoomById').mockResolvedValue({ id: 1, room_number: '102' });

        console.log('\n=========================================================================');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('Cập nhật phòng thành công không có ảnh', async () => {
        const id = 1;
        const updateData = { room_number: '102', floor: 2 };
        const mockRoom = { id, building_id: 1, room_number: '101', update: jest.fn() };

        Room.findByPk.mockResolvedValue(mockRoom);
        Room.findOne.mockResolvedValue(null);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        const result = await RoomService.updateRoom(id, updateData);

        console.log(`[TEST]: Cập nhật phòng cơ bản`);
        console.log(`- Input   : ID=${id}, UpdateData=${JSON.stringify(updateData)}`);
        console.log(`- Expected: Gửi call update vào cơ sở dữ liệu`);

        expect(mockRoom.update).toHaveBeenCalledWith(updateData, expect.any(Object));
        expect(mockTransaction.commit).toHaveBeenCalled();
        expect(RoomImage.destroy).not.toHaveBeenCalled();
    });

    it('Cập nhật phòng thành công và có ảnh mới (reset ảnh)', async () => {
        const id = 1;
        const updateData = { gallery_images: ['newImg1.png'] };
        const mockRoom = { id, building_id: 1, room_number: '101', update: jest.fn() };

        Room.findByPk.mockResolvedValue(mockRoom);
        RoomImage.destroy.mockResolvedValue(true);
        RoomImage.bulkCreate.mockResolvedValue(true);

        await RoomService.updateRoom(id, updateData);

        console.log(`[TEST]: Cập nhật phòng với ảnh gallery mới (xóa ảnh cũ, thêm ảnh mới)`);
        console.log(`- Input   : ID=${id}, Images=${updateData.gallery_images.length}`);

        expect(mockRoom.update).toHaveBeenCalled();
        expect(RoomImage.destroy).toHaveBeenCalledWith({ where: { room_id: id }, transaction: mockTransaction });
        expect(RoomImage.bulkCreate).toHaveBeenCalledWith(
            [{ room_id: id, image_url: 'newImg1.png' }],
            { transaction: mockTransaction }
        );
        expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('Cập nhật lỗi: Phòng không tồn tại', async () => {
        Room.findByPk.mockResolvedValue(null);
        
        console.log(`[TEST]: Cập nhật ID không hợp lệ`);
        try {
            await RoomService.updateRoom(999, {});
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Room not found');
        }
    });

    it('Cập nhật lỗi: Trùng lặp số phòng (khác ID)', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        
        Room.findByPk.mockResolvedValue(mockRoom);
        Room.findOne.mockResolvedValue({ id: 2, room_number: '102' }); // Phòng #2 đang dùng số 102
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        console.log(`[TEST]: Cập nhật phòng trùng số với phòng khác ở cùng tòa nhà`);
        try {
            await RoomService.updateRoom(id, { room_number: '102' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Room number 102 already exists in this building');
        }
    });

    it('Cập nhật lỗi: Đổi building, room_type hoặc number khi đang có booking active', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue({ id: 10, status: 'PENDING' });

        console.log(`[TEST]: Thay đổi định danh (building/room_type/number) khi đang có booking`);
        try {
            await RoomService.updateRoom(id, { building_id: 2 });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Cannot change building, room type, or room number of a room with active bookings');
        }
    });

    it('Cập nhật lỗi: Đổi building, room_type hoặc number khi đang có contract active', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101' };
        
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue({ id: 20, status: 'ACTIVE' });

        console.log(`[TEST]: Thay đổi định danh (building/room_type/number) khi đang có contract`);
        try {
            await RoomService.updateRoom(id, { room_number: '102' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Cannot change building, room type, or room number of a room with active contracts');
        }
    });

    it('Cập nhật lỗi database - rollback transaction', async () => {
        const id = 1;
        const mockRoom = { id, building_id: 1, room_number: '101', update: jest.fn().mockRejectedValue(new Error('Update failed')) };
        
        Room.findByPk.mockResolvedValue(mockRoom);
        Booking.findOne.mockResolvedValue(null);
        Contract.findOne.mockResolvedValue(null);

        console.log(`[TEST]: Lỗi khi lưu data - Rollback transaction`);
        try {
            await RoomService.updateRoom(id, { floor: 2 });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe('Update failed');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        }
    });
});
