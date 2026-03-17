const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { parseLocalDate } = require('../utils/date.util');
const {
    sendPaymentReminderEmail,
    sendPaymentUrgentReminderEmail
} = require('../utils/mail.util');

const run = async () => {
    const { Invoice, Contract, User, Room, Building } = sequelize.models;

    const today = parseLocalDate(new Date().toISOString().split('T')[0]);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const invoiceIncludes = [{
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
    }];

    // Phase 1: 1-day-before reminder (due tomorrow)
    const tomorrowInvoices = await Invoice.findAll({
        where: {
            invoice_type: 'RENT',
            status: 'UNPAID',
            due_date: tomorrowStr
        },
        include: invoiceIncludes
    });

    for (const invoice of tomorrowInvoices) {
        try {
            if (invoice.billing_period_start !== invoice.contract.start_date) continue;
            const customer = invoice.contract.customer;
            if (!customer) continue;

            await sendPaymentReminderEmail(customer.email, {
                customerName: `${customer.last_name} ${customer.first_name}`.trim(),
                invoiceNumber: invoice.invoice_number,
                invoiceId: invoice.id,
                roomNumber: invoice.contract.room?.room_number || '',
                buildingName: invoice.contract.room?.building?.name || '',
                totalAmount: invoice.total_amount?.toLocaleString('vi-VN') + ' VNĐ',
                dueDate: tomorrowStr
            });
        } catch (err) {
            console.error(`[FirstRentReminderJob] Reminder failed for invoice ${invoice.id}:`, err.message);
        }
    }

    // Phase 2: Due-date morning urgent (due today)
    const todayInvoices = await Invoice.findAll({
        where: {
            invoice_type: 'RENT',
            status: 'UNPAID',
            due_date: todayStr
        },
        include: invoiceIncludes
    });

    for (const invoice of todayInvoices) {
        try {
            if (invoice.billing_period_start !== invoice.contract.start_date) continue;
            const customer = invoice.contract.customer;
            if (!customer) continue;

            await sendPaymentUrgentReminderEmail(customer.email, {
                customerName: `${customer.last_name} ${customer.first_name}`.trim(),
                invoiceNumber: invoice.invoice_number,
                invoiceId: invoice.id,
                roomNumber: invoice.contract.room?.room_number || '',
                buildingName: invoice.contract.room?.building?.name || '',
                totalAmount: invoice.total_amount?.toLocaleString('vi-VN') + ' VNĐ',
                dueDate: todayStr
            });
        } catch (err) {
            console.error(`[FirstRentReminderJob] Urgent failed for invoice ${invoice.id}:`, err.message);
        }
    }
};

module.exports = { run };
