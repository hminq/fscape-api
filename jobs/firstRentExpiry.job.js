const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { sendFirstRentCancelledEmail } = require('../utils/mail.util');
const auditService = require('../services/audit.service');

const run = async () => {
    const { Contract, Booking, Room, Invoice, User, Building, ScheduledJob } = sequelize.models;

    const job = await ScheduledJob.create({
        job_name: 'first_rent_expiry',
        job_type: 'CRON',
        status: 'RUNNING',
        started_at: new Date()
    });

    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Find first-rent invoices that are overdue and still unpaid
        const overdueInvoices = await Invoice.findAll({
            where: {
                invoice_type: 'RENT',
                status: 'UNPAID',
                due_date: { [Op.lt]: today }
            },
            include: [{
                model: Contract,
                as: 'contract',
                where: { status: 'ACTIVE' },
                required: true,
                include: [
                    { model: User, as: 'customer', attributes: ['id', 'email', 'first_name', 'last_name'] },
                    {
                        model: Room, as: 'room', attributes: ['id', 'room_number'],
                        include: [{ model: Building, as: 'building', attributes: ['id', 'name'] }]
                    }
                ]
            }]
        });

        // Filter to only first-period invoices (billing_period_start === contract.start_date)
        const firstRentInvoices = overdueInvoices.filter(inv =>
            inv.billing_period_start === inv.contract.start_date
        );

        let processed = 0;

        for (const invoice of firstRentInvoices) {
            const transaction = await sequelize.transaction();
            try {
                const contract = invoice.contract;

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
                        cancellation_reason: 'Chưa thanh toán tiền phòng kỳ đầu'
                    }, { transaction });
                }

                // Invoice → CANCELLED
                await invoice.update({ status: 'CANCELLED' }, { transaction });

                // Audit logs for auto-cancellation
                await auditService.log({
                    user: null,
                    action: 'UPDATE',
                    entityType: 'contract',
                    entityId: contract.id,
                    oldValue: { status: 'ACTIVE' },
                    newValue: { status: 'TERMINATED', reason: 'Chưa thanh toán tiền phòng kỳ đầu (auto)' }
                }, { transaction });

                await auditService.log({
                    user: null,
                    action: 'UPDATE',
                    entityType: 'invoice',
                    entityId: invoice.id,
                    oldValue: { status: 'UNPAID' },
                    newValue: { status: 'CANCELLED', reason: 'Chưa thanh toán tiền phòng kỳ đầu (auto)' }
                }, { transaction });

                if (booking) {
                    await auditService.log({
                        user: null,
                        action: 'UPDATE',
                        entityType: 'booking',
                        entityId: booking.id,
                        oldValue: { status: booking.status },
                        newValue: { status: 'CANCELLED', reason: 'Chưa thanh toán tiền phòng kỳ đầu (auto)' }
                    }, { transaction });
                }

                await transaction.commit();
                processed++;
                console.log(`[FirstRentExpiryJob] Terminated contract ${contract.contract_number} — first rent unpaid`);

                // Send cancellation notification email
                try {
                    const customer = contract.customer;
                    if (customer?.email) {
                        const customerName = `${customer.last_name} ${customer.first_name}`.trim();
                        await sendFirstRentCancelledEmail(customer.email, {
                            customerName,
                            invoiceNumber: invoice.invoice_number,
                            invoiceId: invoice.id,
                            contractNumber: contract.contract_number,
                            roomNumber: contract.room?.room_number || '',
                            buildingName: contract.room?.building?.name || '',
                            totalAmount: invoice.total_amount?.toLocaleString('vi-VN') + ' VNĐ'
                        });
                    }
                } catch (emailErr) {
                    console.error(`[FirstRentExpiryJob] Failed to send cancellation email for ${contract.contract_number}:`, emailErr.message);
                }
            } catch (err) {
                await transaction.rollback();
                console.error(`[FirstRentExpiryJob] Failed to process invoice ${invoice.id}:`, err.message);
            }
        }

        await job.update({
            status: 'COMPLETED',
            completed_at: new Date(),
            records_processed: processed
        });

        if (processed > 0) {
            console.log(`[FirstRentExpiryJob] Completed: ${processed} contract(s) terminated`);
        }
    } catch (err) {
        await job.update({
            status: 'FAILED',
            completed_at: new Date(),
            error_message: err.message
        });
        console.error('[FirstRentExpiryJob] Job failed:', err.message);
    }
};

module.exports = { run };
