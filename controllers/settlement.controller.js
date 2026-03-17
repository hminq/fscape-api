const settlementService = require('../services/settlement.service');

const handleError = (res, err) => {
    console.error('[SettlementController]', err);
    return res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
};

const getSettlement = async (req, res) => {
    try {
        const result = await settlementService.getSettlement(req.params.id);
        return res.status(200).json({ data: result });
    } catch (err) { return handleError(res, err); }
};

const getSettlementByContract = async (req, res) => {
    try {
        const result = await settlementService.getSettlementByContract(req.params.contractId);
        return res.status(200).json({ data: result });
    } catch (err) { return handleError(res, err); }
};

const closeSettlement = async (req, res) => {
    try {
        const result = await settlementService.closeSettlement(req.params.id, req.user);
        return res.status(200).json({ message: 'Settlement closed', data: result });
    } catch (err) { return handleError(res, err); }
};

module.exports = { getSettlement, getSettlementByContract, closeSettlement };
