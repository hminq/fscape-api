const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const run = async () => {
    const { Booking, Room, Payment, ScheduledJob } = sequelize.models;

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
            }
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
