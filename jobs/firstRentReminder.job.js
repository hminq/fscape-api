const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const {
    sendPaymentReminderEmail,
    sendPaymentUrgentReminderEmail
} = require('../utils/mail.util');
const { FIRST_RENT_REMINDER_DAYS_BEFORE_DUE } = require('../constants/jobTimeRules');

const run = async () => {
    const { Invoice, Contract, User, Room, Building } = sequelize.models;

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr + 'T00:00:00Z');
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + FIRST_RENT_REMINDER_DAYS_BEFORE_DUE);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const invoiceIncludes = [{
        model: Contract,
        as: 'contract',
        where: { status: 'PENDING_FIRST_PAYMENT' },
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

    console.log(`[FirstRentReminderJob] Found ${tomorrowInvoices.length} invoice(s) due tomorrow (${tomorrowStr})`);

    for (const invoice of tomorrowInvoices) {
        try {
            if (String(invoice.billing_period_start) !== String(invoice.contract.start_date)) continue;
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

    console.log(`[FirstRentReminderJob] Found ${todayInvoices.length} invoice(s) due today (${todayStr})`);

    for (const invoice of todayInvoices) {
        try {
            if (String(invoice.billing_period_start) !== String(invoice.contract.start_date)) continue;
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
