const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { createNotification } = require('../services/notification.service');
const { sendBookingExpiredEmail } = require('../utils/mail.util');

const formatCurrency = (amount) =>
    Number(amount).toLocaleString('vi-VN') + ' VND';

const run = async () => {
    const { Booking, Room, Payment, User, Building, ScheduledJob } = sequelize.models;

    const job = await ScheduledJob.create({
        job_name: 'booking_expiry',
        job_type: 'CRON',
        status: 'RUNNING',
        started_at: new Date()
    });

    try {
        const expiredBookings = await Booking.findAll({
            where: {
                status: 'PENDING',
                expires_at: { [Op.lt]: new Date() }
            },
            include: [
                {
                    model: Room,
                    as: 'room',
                    include: [{ model: Building, as: 'building' }],
                },
                { model: User, as: 'customer' },
            ],
        });

        let processed = 0;

        for (const booking of expiredBookings) {
            const transaction = await sequelize.transaction();
            try {
                await booking.update({
                    status: 'CANCELLED',
                    cancelled_at: new Date(),
                    cancellation_reason: 'Hết hạn thanh toán đặt cọc'
                }, { transaction });

                await Room.update(
                    { status: 'AVAILABLE' },
                    { where: { id: booking.room_id }, transaction }
                );

                if (booking.deposit_payment_id) {
                    await Payment.update(
                        { status: 'CANCELLED' },
                        { where: { id: booking.deposit_payment_id, status: 'PENDING' }, transaction }
                    );
                }

                await transaction.commit();
                processed++;
                console.log(`[BookingExpiryJob] Cancelled booking ${booking.booking_number}`);

                const customer = booking.customer;
                const room = booking.room;
                const building = room?.building;

                if (customer) {
                    try {
                        await createNotification({
                            type: 'BOOKING',
                            title: 'Đặt phòng đã bị hủy',
                            content: `Đặt phòng ${booking.booking_number} đã bị hủy do hết hạn thanh toán đặt cọc.`,
                            target_type: 'BOOKING',
                            target_id: booking.id,
                            specific_user_ids: [customer.id],
                        });
                    } catch (err) {
                        console.error(`[BookingExpiryJob] Notification failed for ${customer.id}:`, err.message);
                    }

                    try {
                        await sendBookingExpiredEmail(customer.email, {
                            customerName: customer.full_name || customer.email,
                            bookingNumber: booking.booking_number,
                            bookingId: booking.id,
                            roomNumber: room?.room_number || '',
                            buildingName: building?.name || '',
                            depositAmount: formatCurrency(booking.deposit_amount),
                        });
                    } catch (err) {
                        console.error(`[BookingExpiryJob] Email failed for ${customer.email}:`, err.message);
                    }
                }
            } catch (err) {
                await transaction.rollback();
                console.error(`[BookingExpiryJob] Failed to cancel booking ${booking.id}:`, err.message);
            }
        }

        await job.update({
            status: 'COMPLETED',
            completed_at: new Date(),
            records_processed: processed
        });

        if (processed > 0) {
            console.log(`[BookingExpiryJob] Completed: ${processed} booking(s) cancelled`);
        }
    } catch (err) {
        await job.update({
            status: 'FAILED',
            completed_at: new Date(),
            error_message: err.message
        });
        console.error('[BookingExpiryJob] Job failed:', err.message);
    }
};

module.exports = { run };
