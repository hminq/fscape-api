const { Op } = require('sequelize');
const AssetType = require('../models/assetType.model');
const Asset = require('../models/asset.model');
const { ROLES } = require('../constants/roles');

const TIMESTAMP_FIELDS = ['created_at', 'updated_at', 'createdAt', 'updatedAt'];

const getAllAssetTypes = async (query = {}, user = {}) => {
    const { page = 1, limit = 10, search, is_active } = query;
    const offset = (page - 1) * limit;
    const where = {};

    if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
    }
    if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await AssetType.findAndCountAll({
        where,
        limit: Number(limit),
        offset: Number(offset),
        order: [['createdAt', 'DESC']]
    });

    let data = rows;
    if (user.role !== ROLES.ADMIN) {
        data = rows.map(row => {
            const obj = row.toJSON();
            for (const field of TIMESTAMP_FIELDS) delete obj[field];
            return obj;
        });
    }

    const active_count = await AssetType.count({
        where: { ...where, is_active: true }
    });

    return {
        total: count,
        active_count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data
    };
};

const getAssetTypeById = async (id, user = {}) => {
    const assetType = await AssetType.findByPk(id);
    if (!assetType) throw { status: 404, message: 'Asset type not found' };

    if (user.role !== ROLES.ADMIN) {
        const data = assetType.toJSON();
        for (const field of TIMESTAMP_FIELDS) delete data[field];
        return data;
    }
    return assetType;
};

const createAssetType = async (data) => {
    if (!data.name) {
        throw { status: 400, message: 'Asset type name is required' };
    }

    const duplicate = await AssetType.findOne({ where: { name: data.name } });
    if (duplicate) {
        throw { status: 409, message: `Asset type "${data.name}" already exists` };
    }

    if (data.default_price !== undefined && data.default_price < 0) {
        throw { status: 400, message: 'default_price must be >= 0' };
    }

    return AssetType.create(data);
};

const updateAssetType = async (id, data) => {
    const assetType = await AssetType.findByPk(id);
    if (!assetType) throw { status: 404, message: 'Asset type not found' };

    if (data.name && data.name !== assetType.name) {
        const duplicate = await AssetType.findOne({
            where: { name: data.name, id: { [Op.ne]: id } }
        });
        if (duplicate) {
            throw { status: 409, message: `Asset type "${data.name}" already exists` };
        }
    }

    if (data.default_price !== undefined && data.default_price < 0) {
        throw { status: 400, message: 'default_price must be >= 0' };
    }

    await assetType.update(data);
    return assetType;
};

const deleteAssetType = async (id) => {
    const assetType = await AssetType.findByPk(id);
    if (!assetType) throw { status: 404, message: 'Asset type not found' };

    await assetType.update({ is_active: false });
    return { message: `Asset type "${assetType.name}" has been deactivated` };
};

// ─── GET /api/asset-types/stats ──────────────────────────────
const getAssetTypeStats = async () => {
    const all = await AssetType.findAll({
        attributes: ['is_active'],
        raw: true,
    });

    let active = 0, inactive = 0;
    for (const r of all) {
        if (r.is_active) active++;
        else inactive++;
    }

    return {
        total: all.length,
        by_status: { active, inactive },
    };
};

module.exports = { getAllAssetTypes, getAssetTypeById, createAssetType, updateAssetType, deleteAssetType, getAssetTypeStats };
