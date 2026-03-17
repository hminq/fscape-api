const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { sendSigningCancelledEmail } = require('../utils/mail.util');
const auditService = require('../services/audit.service');

const run = async () => {
    const { Contract, Booking, Room, User, Building, ScheduledJob } = sequelize.models;

    const job = await ScheduledJob.create({
        job_name: 'contract_signature_expiry',
        job_type: 'CRON',
        status: 'RUNNING',
        started_at: new Date()
    });

    try {
        const expiredContracts = await Contract.findAll({
            where: {
                status: { [Op.in]: ['PENDING_CUSTOMER_SIGNATURE', 'PENDING_MANAGER_SIGNATURE'] },
                signature_expires_at: { [Op.lt]: new Date() }
            },
            include: [
                { model: User, as: 'customer', attributes: ['id', 'email', 'first_name', 'last_name'] },
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
                await contract.update({
                    status: 'TERMINATED',
                    signature_expires_at: null
                }, { transaction });

                const booking = await Booking.findOne({
                    where: { contract_id: contract.id },
                    transaction
                });

                if (booking) {
                    await booking.update({
                        status: 'CANCELLED',
                        cancelled_at: new Date(),
                        cancellation_reason: 'Hợp đồng hết hạn ký'
                    }, { transaction });

                    await Room.update(
                        { status: 'AVAILABLE' },
                        { where: { id: booking.room_id }, transaction }
                    );
                }

                // Audit log for auto-cancellation
                const previousStatus = contract.status;
                await auditService.log({
                    user: null,
                    action: 'UPDATE',
                    entityType: 'contract',
                    entityId: contract.id,
                    oldValue: { status: previousStatus, signature_expires_at: contract.signature_expires_at },
                    newValue: { status: 'TERMINATED', signature_expires_at: null, reason: 'Hợp đồng hết hạn ký (auto)' }
                }, { transaction });

                if (booking) {
                    await auditService.log({
                        user: null,
                        action: 'UPDATE',
                        entityType: 'booking',
                        entityId: booking.id,
                        oldValue: { status: booking.status },
                        newValue: { status: 'CANCELLED', reason: 'Hợp đồng hết hạn ký (auto)' }
                    }, { transaction });
                }

                await transaction.commit();
                processed++;
                console.log(`[ContractExpiryJob] Cancelled contract ${contract.contract_number} (was ${previousStatus})`);

                // Send cancellation notification email
                try {
                    if (contract.customer?.email) {
                        const customerName = `${contract.customer.last_name} ${contract.customer.first_name}`.trim();
                        await sendSigningCancelledEmail(contract.customer.email, {
                            customerName,
                            contractNumber: contract.contract_number,
                            contractId: contract.id,
                            roomNumber: contract.room?.room_number || '',
                            buildingName: contract.room?.building?.name || ''
                        });
                    }
                } catch (emailErr) {
                    console.error(`[ContractExpiryJob] Failed to send cancellation email for ${contract.contract_number}:`, emailErr.message);
                }
            } catch (err) {
                await transaction.rollback();
                console.error(`[ContractExpiryJob] Failed to cancel contract ${contract.id}:`, err.message);
            }
        }

        await job.update({
            status: 'COMPLETED',
            completed_at: new Date(),
            records_processed: processed
        });

        if (processed > 0) {
            console.log(`[ContractExpiryJob] Completed: ${processed} contract(s) cancelled`);
        }
    } catch (err) {
        await job.update({
            status: 'FAILED',
            completed_at: new Date(),
            error_message: err.message
        });
        console.error('[ContractExpiryJob] Job failed:', err.message);
    }
};

module.exports = { run };
