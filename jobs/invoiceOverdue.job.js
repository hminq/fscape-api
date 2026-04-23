const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { createNotification } = require('../services/notification.service');
const {
    sendInvoiceOverdueResidentEmail,
    sendInvoiceOverdueManagerEmail,
} = require('../utils/mail.util');
const { ROLES } = require('../constants/roles');

const run = async () => {
    const { Invoice, Contract, Room, Building, User, ScheduledJob } = sequelize.models;

    const job = await ScheduledJob.create({
        job_name: 'invoice_overdue',
        job_type: 'CRON',
        status: 'RUNNING',
        started_at: new Date(),
    });

    try {
        const today = new Date().toISOString().split('T')[0];

        const overdueInvoices = await Invoice.findAll({
            where: {
                status: 'UNPAID',
                due_date: { [Op.lt]: today },
            },
            include: [{
                model: Contract,
                as: 'contract',
                attributes: ['id', 'contract_number', 'customer_id', 'room_id'],
                include: [
                    { model: User, as: 'customer', attributes: ['id', 'email', 'first_name', 'last_name'] },
                    {
                        model: Room, as: 'room', attributes: ['id', 'room_number', 'building_id'],
                        include: [{
                            model: Building, as: 'building', attributes: ['id', 'name'],
                        }],
                    },
                ],
            }],
        });

        let processed = 0;

        for (const invoice of overdueInvoices) {
            try {
                await invoice.update({ status: 'OVERDUE' });
                processed++;

                const contract = invoice.contract;
                const customer = contract?.customer;
                const room = contract?.room;
                const building = room?.building;
                const customerName = customer
                    ? `${customer.last_name || ''} ${customer.first_name || ''}`.trim()
                    : '';
                const totalFormatted = Number(invoice.total_amount).toLocaleString('vi-VN') + 'd';

                // Notify resident
                if (customer?.id) {
                    try {
                        await createNotification({
                            type: 'INVOICE',
                            title: 'Hóa đơn quá hạn thanh toán',
                            content: `Hóa đơn ${invoice.invoice_number} đã quá hạn. Vui lòng thanh toán sớm nhất.`,
                            target_type: 'INVOICE',
                            target_id: invoice.id,
                            specific_user_ids: [customer.id],
                        });
                    } catch (err) {
                        console.error(`[InvoiceOverdueJob] Notification failed for resident ${customer.id}:`, err.message);
                    }
                }

                // Email resident
                if (customer?.email) {
                    sendInvoiceOverdueResidentEmail(customer.email, {
                        customerName,
                        invoiceNumber: invoice.invoice_number,
                        invoiceId: invoice.id,
                        roomNumber: room?.room_number || '',
                        buildingName: building?.name || '',
                        totalAmount: totalFormatted,
                        dueDate: invoice.due_date,
                    }).catch(err => console.error(`[InvoiceOverdueJob] Resident email failed:`, err.message));
                }

                // Find and notify building manager
                if (building?.id) {
                    const manager = await User.findOne({
                        where: { building_id: building.id, role: ROLES.BUILDING_MANAGER, is_active: true },
                        attributes: ['id', 'email', 'first_name', 'last_name'],
                    });

                    if (manager) {
                        const managerName = `${manager.last_name || ''} ${manager.first_name || ''}`.trim();

                        try {
                            await createNotification({
                                type: 'INVOICE',
                                title: 'Cư dân có hóa đơn quá hạn',
                                content: `Hóa đơn ${invoice.invoice_number} của ${customerName} (phòng ${room?.room_number || ''}) đã quá hạn thanh toán.`,
                                target_type: 'INVOICE',
                                target_id: invoice.id,
                                specific_user_ids: [manager.id],
                            });
                        } catch (err) {
                            console.error(`[InvoiceOverdueJob] Notification failed for manager ${manager.id}:`, err.message);
                        }

                        if (manager.email) {
                            sendInvoiceOverdueManagerEmail(manager.email, {
                                managerName,
                                invoiceNumber: invoice.invoice_number,
                                invoiceId: invoice.id,
                                customerName,
                                roomNumber: room?.room_number || '',
                                buildingName: building?.name || '',
                                totalAmount: totalFormatted,
                                dueDate: invoice.due_date,
                            }).catch(err => console.error(`[InvoiceOverdueJob] Manager email failed:`, err.message));
                        }
                    }
                }
            } catch (err) {
                console.error(`[InvoiceOverdueJob] Failed to process invoice ${invoice.id}:`, err.message);
            }
        }

        await job.update({
            status: 'COMPLETED',
            completed_at: new Date(),
            records_processed: processed,
        });

        if (processed > 0) {
            console.log(`[InvoiceOverdueJob] Completed: ${processed} invoice(s) marked OVERDUE`);
        }
    } catch (err) {
        await job.update({
            status: 'FAILED',
            completed_at: new Date(),
            error_message: err.message,
        });
        console.error('[InvoiceOverdueJob] Job failed:', err.message);
    }
};

module.exports = { run };
