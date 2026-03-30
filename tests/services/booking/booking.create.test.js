const BookingService = require('../../../services/booking.service');
const { sequelize } = require('../../../config/db');

// 1. Mock DB and Models (Individual class-level mocks are more reliable in this environment)
jest.mock('../../../models/booking.model', () => ({ create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), findOne: jest.fn() }));
jest.mock('../../../models/room.model', () => ({ findByPk: jest.fn() }));
jest.mock('../../../models/roomType.model', () => ({ findByPk: jest.fn() }));
jest.mock('../../../models/customerProfile.model', () => ({ findOrCreate: jest.fn() }));
jest.mock('../../../models/auditLog.model', () => ({ create: jest.fn() }));

const Booking = require('../../../models/booking.model');
const Room = require('../../../models/room.model');
const RoomType = require('../../../models/roomType.model');
const CustomerProfile = require('../../../models/customerProfile.model');

// 2. Mock DB config and use the already-mocked models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Booking: require('../../../models/booking.model'),
            Room: require('../../../models/room.model'),
            RoomType: require('../../../models/roomType.model'),
            CustomerProfile: require('../../../models/customerProfile.model'),
            User: { findByPk: jest.fn() }
        },
        transaction: jest.fn().mockResolvedValue({ 
            commit: jest.fn(), 
            rollback: jest.fn(), 
            LOCK: { UPDATE: 'UPDATE' } 
        }),
        authenticate: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

describe('BookingService - unified', () => {
    let mockTransaction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransaction = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
        sequelize.transaction.mockResolvedValue(mockTransaction);
        
        // Default Mock for ROOM - MUST include room_type and update
        const mockRoom = { 
            id: 'room-1', status: 'AVAILABLE', room_type_id: 'rt-1',
            room_type: { id: 'rt-1', base_price: 5000000 },
            update: jest.fn().mockResolvedValue(true)
        };
        Room.findByPk.mockResolvedValue(mockRoom);
        RoomType.findByPk.mockResolvedValue(mockRoom.room_type);
        
        // Default Mock for Profile
        CustomerProfile.findOrCreate.mockResolvedValue([{ id: 123 }, true]);

        console.log('\n=========================================================================');
    });

    const getValidCheckInStr = (offset = 7) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d.toISOString().split('T')[0];
    };

    it('TC_BOOKING_01: Tạo booking thành công', async () => {
        const checkInStr = getValidCheckInStr();
        const bookingData = {
            roomId: 'room-1', durationMonths: 6, billingCycle: 'CYCLE_1M', checkInDate: checkInStr,
            customerInfo: { gender: 'MALE' }
        };

        Booking.findOne.mockResolvedValue(null);
        Booking.create.mockResolvedValue({ id: 100 });

        const result = await BookingService.createBooking(1, bookingData);
        expect(result.id).toBe(100);
    });

    it('TC_BOOKING_02: Lỗi thời hạn hợp đồng không hợp lệ', async () => {
        const bookingData = { durationMonths: 5 };
        console.log(`[TEST]: Tạo booking thất bại - Sai thời hạn`);
        try {
            await BookingService.createBooking(1, bookingData);
        } catch (error) {
            console.log(`- Actual Error: "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Thời hạn hợp đồng chỉ hỗ trợ 6 hoặc 12 tháng.');
        }
    });

    it('TC_BOOKING_03: Lỗi ngày check-in không hợp lệ', async () => {
        const d = new Date(); d.setDate(d.getDate() + 1);
        const bookingData = { durationMonths: 6, checkInDate: d.toISOString().split('T')[0] };
        console.log(`[TEST]: Tạo booking thất bại - Sai ngày check-in`);
        try {
            await BookingService.createBooking(1, bookingData);
        } catch (error) {
            console.log(`- Actual Error: "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toContain('Ngày nhận phòng phải trong khoảng');
        }
    });

    it('TC_BOOKING_04: Lỗi phòng đã được thuê', async () => {
        const checkInStr = getValidCheckInStr();
        const bookingData = { roomId: 'room-1', durationMonths: 6, checkInDate: checkInStr, customerInfo: { gender: 'MALE' } };
        Booking.findOne.mockResolvedValue(null);
        Room.findByPk.mockResolvedValue({ id: 'room-1', status: 'OCCUPIED' });
        console.log(`[TEST]: Tạo booking thất bại - Phòng không trống`);
        try {
            await BookingService.createBooking(1, bookingData);
        } catch (error) {
            console.log(`- Actual Error: "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Phòng này hiện không còn trống.');
        }
    });

    it('TC_BOOKING_05: Lỗi khi người dùng đã có đơn đặt phòng chưa hoàn tất', async () => {
        const checkInStr = getValidCheckInStr();
        const bookingData = { roomId: 'room-1', durationMonths: 6, checkInDate: checkInStr, customerInfo: { gender: 'MALE' } };
        Booking.findOne.mockResolvedValue({ id: 99, status: 'PENDING' });
        console.log(`[TEST]: Tạo booking thất bại - Đã có đơn chưa hoàn tất`);
        try {
            await BookingService.createBooking(1, bookingData);
        } catch (error) {
            console.log(`- Actual Error: "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Bạn đang có một đơn đặt phòng chưa hoàn thành. Vui lòng hoàn tất hoặc hủy đơn cũ trước.');
        }
    });

    it('TC_BOOKING_06: Lỗi khi chu kỳ thanh toán không hợp lệ', async () => {
        const checkInStr = getValidCheckInStr();
        const bookingData = { roomId: 'room-1', durationMonths: 6, checkInDate: checkInStr, billingCycle: 'INVALID', customerInfo: { gender: 'MALE' } };
        Booking.findOne.mockResolvedValue(null);
        console.log(`[TEST]: Tạo booking thất bại - Chu kỳ thanh toán không hợp lệ`);
        try {
            await BookingService.createBooking(1, bookingData);
        } catch (error) {
            console.log(`- Actual Error: "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toContain('Chu kỳ thanh toán không hợp lệ');
        }
    });
});
