const { sequelize } = require('../config/db');
const { generatePeriodicInvoices } = require('../services/invoice.service');

const run = async () => {
    const { ScheduledJob } = sequelize.models;

    const job = await ScheduledJob.create({
        job_name: 'invoice_generation',
        job_type: 'CRON',
        status: 'RUNNING',
        started_at: new Date()
    });

    try {
        const generatedCount = await generatePeriodicInvoices();

        await job.update({
            status: 'COMPLETED',
            completed_at: new Date(),
            records_processed: generatedCount
        });

        if (generatedCount > 0) {
            console.log(`[InvoiceGenerationJob] Completed: ${generatedCount} invoice(s) created`);
        }
    } catch (err) {
        await job.update({
            status: 'FAILED',
            completed_at: new Date(),
            error_message: err.message
        });
        console.error('[InvoiceGenerationJob] Job failed:', err.message);
    }
};

module.exports = { run };
