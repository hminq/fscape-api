const cron = require('node-cron');
const contractSignatureExpiry = require('./contractSignatureExpiry.job');
const contractExpiringSoon = require('./contractExpiringSoon.job');
const bookingExpiry = require('./bookingExpiry.job');
const invoiceGeneration = require('./invoiceGeneration.job');
const firstRentExpiry = require('./firstRentExpiry.job');
const signingReminder = require('./signingReminder.job');
const firstRentReminder = require('./firstRentReminder.job');

function initCronJobs() {
    // Contract signature expiry — every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        try {
            await contractSignatureExpiry.run();
        } catch (err) {
            console.error('[CronScheduler] contractSignatureExpiry error:', err.message);
        }
    });

    // Booking expiry — every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        try {
            await bookingExpiry.run();
        } catch (err) {
            console.error('[CronScheduler] bookingExpiry error:', err.message);
        }
    });

    // Contract expiring soon — daily at 3:00 AM
    cron.schedule('0 3 * * *', async () => {
        try {
            await contractExpiringSoon.run();
        } catch (err) {
            console.error('[CronScheduler] contractExpiringSoon error:', err.message);
        }
    });

    // Invoice generation — daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        try {
            await invoiceGeneration.run();
        } catch (err) {
            console.error('[CronScheduler] invoiceGeneration error:', err.message);
        }
    });

    // First rent invoice expiry — every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        try {
            await firstRentExpiry.run();
        } catch (err) {
            console.error('[CronScheduler] firstRentExpiry error:', err.message);
        }
    });

    // Signing reminder — every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        try {
            await signingReminder.run();
        } catch (err) {
            console.error('[CronScheduler] signingReminder error:', err.message);
        }
    });

    // First rent payment reminder — daily at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
        try {
            await firstRentReminder.run();
        } catch (err) {
            console.error('[CronScheduler] firstRentReminder error:', err.message);
        }
    });

    console.log('[CronScheduler] Cron jobs initialized');
}

module.exports = { initCronJobs };
