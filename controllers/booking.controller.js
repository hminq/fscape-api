const bookingService = require('../services/booking.service');
const paymentService = require('../services/payment.service');

const usePayOS = !!process.env.PAYOS_CLIENT_ID;

const createBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const booking = await bookingService.createBooking(userId, req.body);

        let paymentData;
        if (usePayOS) {
            const payosResult = await paymentService.createBookingPaymentUrlPayOS(userId, booking.id);
            paymentData = { checkoutUrl: payosResult.checkoutUrl, orderCode: payosResult.orderCode };
        } else {
            const ipAddr = "127.0.0.1";
            const vnpayResult = await paymentService.createBookingPaymentUrl(userId, booking.id, ipAddr);
            paymentData = { paymentUrl: vnpayResult.paymentUrl };
        }

        return res.status(201).json({
            message: 'Đã tạo đơn đặt phòng thành công.',
            data: {
                ...booking.toJSON(),
                ...paymentData
            }
        });
    } catch (error) {
        console.error('❌ Controller Error (createBooking):', error);
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
            bookingNumber: req.query.bookingNumber,
            customerName: req.query.customerName,
            roomNumber: req.query.roomNumber,
            buildingName: req.query.buildingName
        };
        
        const result = await bookingService.getAllBookings(filters);

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
