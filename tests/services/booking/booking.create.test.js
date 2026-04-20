const BookingService = require('../../../services/booking.service');
const { sequelize } = require('../../../config/db');

// 1. Mock DB and Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Booking: { create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), findOne: jest.fn() },
        Room: { findByPk: jest.fn() },
        RoomType: { findByPk: jest.fn() },
        User: { findByPk: jest.fn() },
        CustomerProfile: { findOrCreate: jest.fn() },
        Contract: { findByPk: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            fn: jest.fn(),
            col: jest.fn(),
            where: jest.fn(),
            transaction: jest.fn().mockResolvedValue({ 
                commit: jest.fn(), 
                rollback: jest.fn(), 
                LOCK: { UPDATE: 'UPDATE' } 
            }),
            authenticate: jest.fn().mockResolvedValue(),
            close: jest.fn().mockResolvedValue()
        },
        connectDB: jest.fn().mockResolvedValue()
    };
});

// Explicitly mock model files
jest.mock('../../../models/booking.model', () => (require('../../../config/db').sequelize.models.Booking));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));
jest.mock('../../../models/customerProfile.model', () => (require('../../../config/db').sequelize.models.CustomerProfile));

const { Booking, Room, RoomType, CustomerProfile } = sequelize.models;

describe('BookingService - createBooking', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Helper for valid check-in date
        const validDate = new Date();
        validDate.setDate(validDate.getDate() + 7);
        this.validDateStr = validDate.toISOString().split('T')[0];

        // Reset default mock states
        Room.findByPk.mockResolvedValue({ id: 10, status: 'AVAILABLE', room_type_id: 1, update: jest.fn() });
        RoomType.findByPk.mockResolvedValue({ id: 1, base_price: 5000000 });
        CustomerProfile.findOrCreate.mockResolvedValue([{ update: jest.fn() }, true]);
        Booking.create.mockResolvedValue({ id: 'bk-123' });
        
        console.log('\n=========================================================================');
    });

    it('TC_BOOKING_01: Tạo đơn đặt phòng thành công (Happy Path)', async () => {
        const userId = 1;
        const bookingData = {
            roomId: 10,
            checkInDate: this.validDateStr,
            durationMonths: 6,
            billingCycle: 'CYCLE_1M',
            customerInfo: { gender: 'Male' }
        };

        const mockRoom = { 
            id: 10, status: 'AVAILABLE', room_type_id: 1, 
            update: jest.fn().mockResolvedValue(true) 
        };
        Room.findByPk.mockResolvedValue(mockRoom);
        RoomType.findByPk.mockResolvedValue({ id: 1, base_price: 5000000 });
        CustomerProfile.findOrCreate.mockResolvedValue([{ update: jest.fn() }, true]);
        Booking.create.mockResolvedValue({ id: 'bk-123', booking_number: 'BK-001' });

        const result = await BookingService.createBooking(userId, bookingData);

        console.log(`[TEST]: Tạo đơn đặt phòng thành công`);
        expect(result.id).toBe('bk-123');
        expect(mockRoom.update).toHaveBeenCalledWith({ status: 'LOCKED' }, expect.any(Object));
    });

    it('TC_BOOKING_02: Lỗi khi phòng hiện không trống (400)', async () => {
        const bookingData = { roomId: 10, checkInDate: this.validDateStr, durationMonths: 6, billingCycle: 'CYCLE_1M' };
        Room.findByPk.mockResolvedValue({ id: 10, status: 'OCCUPIED' });

        console.log(`[TEST]: Đặt phòng đã có người ở`);
        try {
            await BookingService.createBooking(1, bookingData);
            throw new Error('Should error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toBe('Phòng này hiện không còn trống.');
        }
    });

    it('TC_BOOKING_03: Lỗi ngày nhận phòng quá sớm (400)', async () => {
        const date = new Date(); // Today
        const bookingData = { roomId: 10, checkInDate: date.toISOString().split('T')[0], durationMonths: 6 };
        
        console.log(`[TEST]: Ngày nhận phòng không hợp lệ (quá sớm)`);
        try {
            await BookingService.createBooking(1, bookingData);
            throw new Error('Should error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toContain('Ngày nhận phòng phải trong khoảng');
        }
    });

    it('TC_BOOKING_04: Lỗi khi thời hạn hợp đồng không hợp lệ (400)', async () => {
        const bookingData = { roomId: 10, checkInDate: this.validDateStr, durationMonths: 5 };
        
        console.log(`[TEST]: Thời hạn hợp đồng không hợp lệ`);
        try {
            await BookingService.createBooking(1, bookingData);
            throw new Error('Should error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toBe('Thời hạn hợp đồng chỉ hỗ trợ 6 hoặc 12 tháng.');
        }
    });

    it('TC_BOOKING_05: Chu kỳ thanh toán tự động chuẩn hóa về mặc định nếu không hợp lệ (Happy Path)', async () => {
        const bookingData = { 
            roomId: 10, 
            checkInDate: this.validDateStr, 
            durationMonths: 6, 
            billingCycle: 'INVALID',
            customerInfo: { gender: 'Male' } 
        };
        
        console.log(`[TEST]: Chu kỳ thanh toán không hợp lệ -> Tự động chuẩn hóa`);
        
        const result = await BookingService.createBooking(1, bookingData);

        expect(result.id).toBe('bk-123');
        // Check if Booking.create was called with 'CYCLE_1M' (the default)
        expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
            billing_cycle: 'CYCLE_1M'
        }), expect.any(Object));
    });
});
