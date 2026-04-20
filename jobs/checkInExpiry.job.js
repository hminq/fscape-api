const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const auditService = require('../services/audit.service');
const { CHECK_IN_EXPIRY_DAYS } = require('../constants/jobTimeRules');

const run = async () => {
    const { Contract, Booking, Room, User, Building, ScheduledJob } = sequelize.models;

    const job = await ScheduledJob.create({
        job_name: 'check_in_expiry',
        job_type: 'CRON',
        status: 'RUNNING',
        started_at: new Date()
    });

    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayUTC = new Date(todayStr + 'T00:00:00Z');

        const deadlineDate = new Date(todayUTC);
        deadlineDate.setUTCDate(deadlineDate.getUTCDate() - CHECK_IN_EXPIRY_DAYS);
        const deadlineStr = deadlineDate.toISOString().split('T')[0];

        // Find contracts in PENDING_CHECK_IN where start_date + 3 days has passed
        const expiredContracts = await Contract.findAll({
            where: {
                status: 'PENDING_CHECK_IN',
                start_date: { [Op.lt]: deadlineStr }
            },
            include: [
                { model: User, as: 'customer', attributes: ['id', 'email', 'first_name', 'last_name', 'role'] },
                {
                    model: Room, as: 'room', attributes: ['id', 'room_number'],
                    include: [{ model: Building, as: 'building', attributes: ['id', 'name'] }]
                }
            ]
        });

        let processed = 0;

        for (const contract of expiredContracts) {
            const transaction = await sequelize.transaction();
            try {
                // Contract → TERMINATED
                await Contract.update(
                    { status: 'TERMINATED' },
                    { where: { id: contract.id }, transaction }
                );

                // Room → AVAILABLE
                await Room.update(
                    { status: 'AVAILABLE' },
                    { where: { id: contract.room_id }, transaction }
                );

                // Booking → CANCELLED
                const booking = await Booking.findOne({
                    where: { contract_id: contract.id },
                    transaction
                });
                if (booking) {
                    await booking.update({
                        status: 'CANCELLED',
                        cancelled_at: new Date(),
                        cancellation_reason: 'Không nhận phòng trong thời hạn quy định'
                    }, { transaction });
                }

                // RESIDENT → CUSTOMER if no other active/pending contracts
                const otherActive = await Contract.count({
                    where: {
                        customer_id: contract.customer_id,
                        id: { [Op.ne]: contract.id },
                        status: { [Op.in]: ['PENDING_FIRST_PAYMENT', 'PENDING_CHECK_IN', 'ACTIVE', 'EXPIRING_SOON'] }
                    },
                    transaction
                });
                if (otherActive === 0) {
                    await User.update(
                        { role: 'CUSTOMER' },
                        { where: { id: contract.customer_id, role: 'RESIDENT' }, transaction }
                    );
                }

                // Audit logs
                await auditService.log({
                    user: null,
                    action: 'UPDATE',
                    entityType: 'contract',
                    entityId: contract.id,
                    oldValue: { status: 'PENDING_CHECK_IN' },
                    newValue: { status: 'TERMINATED', reason: 'Không nhận phòng trong thời hạn quy định (auto)' }
                }, { transaction });

                if (booking) {
                    await auditService.log({
                        user: null,
                        action: 'UPDATE',
                        entityType: 'booking',
                        entityId: booking.id,
                        oldValue: { status: booking.status },
                        newValue: { status: 'CANCELLED', reason: 'Không nhận phòng trong thời hạn quy định (auto)' }
                    }, { transaction });
                }

                await transaction.commit();
                processed++;
                console.log(`[CheckInExpiryJob] Terminated contract ${contract.contract_number} - check-in deadline expired`);

            } catch (err) {
                await transaction.rollback();
                console.error(`[CheckInExpiryJob] Failed to process contract ${contract.id}:`, err.message);
            }
        }

        await job.update({
            status: 'COMPLETED',
            completed_at: new Date(),
            records_processed: processed
        });

        if (processed > 0) {
            console.log(`[CheckInExpiryJob] Completed: ${processed} contract(s) terminated`);
        }
    } catch (err) {
        await job.update({
            status: 'FAILED',
            completed_at: new Date(),
            error_message: err.message
        });
        console.error('[CheckInExpiryJob] Job failed:', err.message);
    }
};

module.exports = { run };
