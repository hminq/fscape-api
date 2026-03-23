const contractService = require('../services/contract.service');

const handleError = (res, err) => {
    console.error('[ContractController]', err);
    const status = err.status || 500;
    const message = err.message || 'Lỗi hệ thống';
    return res.status(status).json({ message });
};

// [GET] /api/contracts
const getAllContracts = async (req, res) => {
    try {
        const result = await contractService.getAllContracts(req.query, req.user);
        return res.status(200).json({ ...result });
    } catch (err) { return handleError(res, err); }
};

// [GET] /api/contracts/:id
const getContractById = async (req, res) => {
    try {
        const contract = await contractService.getContractById(req.params.id, req.user);
        return res.status(200).json({ data: contract });
    } catch (err) { return handleError(res, err); }
};

// [PUT] /api/contracts/:id
const updateContract = async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'Dữ liệu gửi lên rỗng' });
        }
        const contract = await contractService.updateContract(req.params.id, req.body, req.user);
        return res.status(200).json({
            message: 'Cập nhật hợp đồng thành công',
            data: contract
        });
    } catch (err) { return handleError(res, err); }
};

// [GET] /api/contracts/my
const getMyContracts = async (req, res) => {
    try {
        const result = await contractService.getMyContracts(req.user.id, req.query);
        return res.status(200).json(result);
    } catch (err) { return handleError(res, err); }
};

// [PATCH] /api/contracts/:id/sign — Customer/Resident signs (authenticated)
const customerSign = async (req, res) => {
    try {
        const { signature_url } = req.body;
        if (!signature_url) {
            console.warn('[ContractController] customerSign: missing signature_url');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }

        const contract = await contractService.customerSign(
            req.params.id, signature_url, req.user, req
        );

        return res.status(200).json({
            message: 'Ký hợp đồng thành công',
            data: contract
        });
    } catch (err) { return handleError(res, err); }
};

// [PATCH] /api/contracts/:id/manager-sign — Building Manager signs
const managerSign = async (req, res) => {
    try {
        const { signature_url } = req.body;
        if (!signature_url) {
            console.warn('[ContractController] managerSign: missing signature_url');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }

        const contract = await contractService.managerSign(
            req.params.id, signature_url, req.user, req
        );

        return res.status(200).json({
            message: 'Ký và kích hoạt hợp đồng thành công',
            data: contract
        });
    } catch (err) { return handleError(res, err); }
};

// [POST] /api/contracts/:id/renew — Resident renews their contract
const renewContract = async (req, res) => {
    try {
        const contract = await contractService.renewContract(
            req.params.id, req.body, req.user
        );
        return res.status(201).json({
            message: 'Tạo hợp đồng gia hạn thành công',
            data: contract
        });
    } catch (err) { return handleError(res, err); }
};

// [GET] /api/contracts/stats
const getContractStats = async (req, res) => {
    try {
        const stats = await contractService.getContractStats();
        return res.status(200).json({ data: stats });
    } catch (err) { return handleError(res, err); }
};

// [POST] /api/contracts/:id/send-reminder — BM/Admin sends manual email reminder
const sendReminder = async (req, res) => {
    try {
        const { reminder_type } = req.body;
        const result = await contractService.sendManualReminder(
            req.params.id, reminder_type, req.user
        );
        return res.status(200).json(result);
    } catch (err) { return handleError(res, err); }
};

// [PATCH] /api/contracts/:id/terminate — Admin/BM terminates contract
const terminateContract = async (req, res) => {
    try {
        const result = await contractService.terminateContract(
            req.params.id, req.body, req.user, req
        );

        const message = result.case === 'TERMINATED'
            ? 'Đã chấm dứt hợp đồng thành công'
            : 'Đã tạo yêu cầu checkout — nhân viên sẽ thực hiện checkout để hoàn tất';

        return res.status(200).json({
            message,
            data: {
                contract: result.contract,
                checkout_request: result.checkoutRequest || null
            }
        });
    } catch (err) { return handleError(res, err); }
};

module.exports = {
    getAllContracts,
    getContractById,
    getMyContracts,
    updateContract,
    customerSign,
    managerSign,
    renewContract,
    getContractStats,
    sendReminder,
    terminateContract
};
