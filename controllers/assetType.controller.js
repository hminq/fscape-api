const assetTypeService = require('../services/assetType.service');

const handleError = (res, err) => {
    console.error('[AssetTypeController]', err);
    return res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
};

const getAllAssetTypes = async (req, res) => {
    try {
        const result = await assetTypeService.getAllAssetTypes(req.query, req.user);
        return res.status(200).json({ ...result });
    } catch (err) { return handleError(res, err); }
};

const getAssetTypeById = async (req, res) => {
    try {
        const data = await assetTypeService.getAssetTypeById(req.params.id, req.user);
        return res.status(200).json({ data });
    } catch (err) { return handleError(res, err); }
};

const createAssetType = async (req, res) => {
    try {
        const data = await assetTypeService.createAssetType(req.body);
        return res.status(201).json({ message: 'Asset type created', data });
    } catch (err) { return handleError(res, err); }
};

const updateAssetType = async (req, res) => {
    try {
        const data = await assetTypeService.updateAssetType(req.params.id, req.body);
        return res.status(200).json({ message: 'Asset type updated', data });
    } catch (err) { return handleError(res, err); }
};

const deleteAssetType = async (req, res) => {
    try {
        const result = await assetTypeService.deleteAssetType(req.params.id);
        return res.status(200).json({ ...result });
    } catch (err) { return handleError(res, err); }
};

const getAssetTypeStats = async (req, res) => {
    try {
        const stats = await assetTypeService.getAssetTypeStats();
        return res.status(200).json({ data: stats });
    } catch (err) { return handleError(res, err); }
};

module.exports = { getAllAssetTypes, getAssetTypeById, createAssetType, updateAssetType, deleteAssetType, getAssetTypeStats };
