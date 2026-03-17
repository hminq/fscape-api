const invoiceService = require('../services/invoice.service');

const handleError = (res, err) => {
    console.error('[InvoiceController]', err);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    return res.status(status).json({ message });
};

const triggerInvoiceJob = async (req, res) => {
    try {
        const count = await invoiceService.generatePeriodicInvoices();
        return res.status(200).json({ message: `Đã sinh thành công ${count} hóa đơn.` });
    } catch (err) {
        return handleError(res, err);
    }
};

const getAllInvoices = async (req, res) => {
    try {
        const result = await invoiceService.getAllInvoices(req.user, req.query);
        return res.status(200).json({ ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

const getInvoiceStats = async (req, res) => {
    try {
        const stats = await invoiceService.getInvoiceStats(req.user);
        return res.status(200).json({ data: stats });
    } catch (err) {
        return handleError(res, err);
    }
};

const getMyInvoices = async (req, res) => {
    try {
        const invoices = await invoiceService.getMyInvoices(req.user.id);
        return res.status(200).json({ data: invoices });
    } catch (err) {
        return handleError(res, err);
    }
};

const getInvoiceById = async (req, res) => {
    try {
        const invoice = await invoiceService.getInvoiceById(req.user, req.params.id);
        return res.status(200).json({ data: invoice });
    } catch (err) {
        return handleError(res, err);
    }
};

module.exports = {
    triggerInvoiceJob,
    getAllInvoices,
    getInvoiceStats,
    getMyInvoices,
    getInvoiceById
};
