const bookingService = require('../services/booking.service');
const paymentService = require('../services/payment.service');

const createBooking = async (req, res) => {
    let booking = null;

    try {
        const userId = req.user.id;
        booking = await bookingService.createBooking(userId, req.body);

        const payosResult = await paymentService.createBookingPaymentUrlPayOS(userId, booking.id);
        const paymentData = { checkoutUrl: payosResult.checkoutUrl, orderCode: payosResult.orderCode };

        return res.status(201).json({
            message: 'Đã tạo đơn đặt phòng thành công.',
            data: {
                ...booking.toJSON(),
                ...paymentData
            }
        });
    } catch (error) {
        if (booking && error.status === 502) {
            try {
                await bookingService.cancelBookingForPaymentFailure(booking.id);
            } catch (cleanupError) {
                console.error('Failed to cleanup booking after payment gateway error:', cleanupError);
            }
        }

        console.error('Controller Error (createBooking):', error);
        return res.status(error.status || 500).json({
            message: error.message || 'Internal Server Error'
        });
    }
};

const getMyBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await bookingService.getMyBookings(userId, req.query);

        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || 'Internal Server Error'
        });
    }
};

const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await bookingService.getBookingById(id, req.user);

        return res.status(200).json({
            data: booking
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || 'Internal Server Error'
        });
    }
};
const getAllBookings = async (req, res) => {
    try {
        const filters = {
            page: req.query.page || 1,
            limit: req.query.limit || 10,
            status: req.query.status,
            booking_number: req.query.booking_number,
            customer_name: req.query.customer_name,
            room_number: req.query.room_number,
            building_name: req.query.building_name,
            building_id: req.query.building_id,
            search: req.query.search
        };
        
        const result = await bookingService.getAllBookings(filters, req.user);

        return res.status(200).json({
            message: 'Danh sách đơn đặt phòng',
            ...result
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || 'Internal Server Error'
        });
    }
};
module.exports = {
    createBooking,
    getMyBookings,
    getBookingById,
    getAllBookings,
};
