const inspectionService = require('../services/inspection.service');

const handleError = (res, err) => {
    console.error('[InspectionController]', err);
    return res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
};

const VALID_CONDITIONS = ['GOOD', 'BROKEN'];

function validateAssetsInput(assets) {
    if (!Array.isArray(assets) || assets.length === 0) {
        return 'assets[] is required and must be a non-empty array';
    }
    for (let i = 0; i < assets.length; i++) {
        const a = assets[i];
        if (!a.qr_code || typeof a.qr_code !== 'string') {
            return `assets[${i}].qr_code is required and must be a string`;
        }
        if (!VALID_CONDITIONS.includes(a.condition)) {
            return `assets[${i}].condition must be GOOD or BROKEN`;
        }
    }
    return null;
}

// ─── Staff CHECK_OUT ─────────────────────────────────────────

const previewInspection = async (req, res) => {
    try {
        const { room_id, assets } = req.body;
        if (!room_id) {
            return res.status(400).json({ message: 'room_id is required' });
        }
        const validationError = validateAssetsInput(assets);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        const result = await inspectionService.previewInspection(room_id, assets, req.user);
        return res.status(200).json({ data: result });
    } catch (err) { return handleError(res, err); }
};

const confirmInspection = async (req, res) => {
    try {
        const { room_id, assets, notes } = req.body;
        if (!room_id) {
            return res.status(400).json({ message: 'room_id is required' });
        }
        const validationError = validateAssetsInput(assets);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        const result = await inspectionService.confirmInspection(room_id, assets, notes, req.user);
        return res.status(201).json({ message: 'Inspection recorded', data: result });
    } catch (err) { return handleError(res, err); }
};

// ─── Resident CHECK_IN ───────────────────────────────────────

const residentPreviewCheckIn = async (req, res) => {
    try {
        const validationError = validateAssetsInput(req.body.assets);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        const result = await inspectionService.residentPreviewCheckIn(req.body.assets, req.user);
        return res.status(200).json({ data: result });
    } catch (err) { return handleError(res, err); }
};

const residentConfirmCheckIn = async (req, res) => {
    try {
        const validationError = validateAssetsInput(req.body.assets);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        const result = await inspectionService.residentConfirmCheckIn(req.body.assets, req.body.notes, req.user);
        return res.status(201).json({ message: 'Check-in successful', data: result });
    } catch (err) {
        if (err.data) {
            return res.status(err.status || 400).json({ message: err.message, data: err.data });
        }
        return handleError(res, err);
    }
};

module.exports = { previewInspection, confirmInspection, residentPreviewCheckIn, residentConfirmCheckIn };
