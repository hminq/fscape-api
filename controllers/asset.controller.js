const assetService = require('../services/asset.service');

const handleError = (res, err) => {
    console.error('[AssetController]', err);
    return res.status(err.status || 500).json({ message: err.message || 'Lỗi hệ thống' });
};

const getAllAssets = async (req, res) => {
    try {
        const result = await assetService.getAllAssets(req.query, req.user);
        return res.status(200).json({ ...result });
    } catch (err) { return handleError(res, err); }
};

const getAssetById = async (req, res) => {
    try {
        const asset = await assetService.getAssetById(req.params.id, req.user);
        return res.status(200).json({ data: asset });
    } catch (err) { return handleError(res, err); }
};

const createAsset = async (req, res) => {
    try {
        const { name, building_id } = req.body;
        if (!name || !building_id) {
            console.warn('[AssetController] createAsset: missing name or building_id');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }
        const asset = await assetService.createAsset(req.body);
        return res.status(201).json({ message: 'Tạo tài sản thành công', data: asset });
    } catch (err) { return handleError(res, err); }
};

const createBatchAssets = async (req, res) => {
    try {
        const { name, building_id, asset_type_id, quantity, price } = req.body;
        if (!name || !building_id) {
            console.warn('[AssetController] createBatchAssets: missing name or building_id');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }
        const result = await assetService.createBatchAssets({ name, building_id, asset_type_id, quantity, price });
        return res.status(201).json({ message: `Đã tạo thành công ${result.count} tài sản`, ...result });
    } catch (err) { return handleError(res, err); }
};

const updateAsset = async (req, res) => {
    try {
        const asset = await assetService.updateAsset(req.params.id, req.body, req.user);
        return res.status(200).json({ message: 'Cập nhật tài sản thành công', data: asset });
    } catch (err) { return handleError(res, err); }
};

const assignAsset = async (req, res) => {
    try {
        const { room_id, notes } = req.body;
        const asset = await assetService.assignAsset(req.params.id, { room_id: room_id || null, notes }, req.user);
        return res.status(200).json({ message: 'Gán tài sản thành công', data: asset });
    } catch (err) { return handleError(res, err); }
};

const deleteAsset = async (req, res) => {
    try {
        const result = await assetService.deleteAsset(req.params.id);
        return res.status(200).json({ ...result });
    } catch (err) { return handleError(res, err); }
};

const getAssetStats = async (req, res) => {
    try {
        const stats = await assetService.getAssetStats(req.user);
        return res.status(200).json({ data: stats });
    } catch (err) { return handleError(res, err); }
};

module.exports = { getAllAssets, getAssetById, createAsset, createBatchAssets, updateAsset, assignAsset, deleteAsset, getAssetStats };
