const { Op } = require('sequelize');
const { randomUUID } = require('crypto');
const { sequelize } = require('../config/db');
const Asset = require('../models/asset.model');
const AssetHistory = require('../models/assetHistory.model');
const Building = require('../models/building.model');
const Room = require('../models/room.model');
const Request = require('../models/request.model');

const { ROLES } = require('../constants/roles');

const TIMESTAMP_FIELDS = ['created_at', 'updated_at', 'createdAt', 'updatedAt'];

// ─── Helpers ──────────────────────────────────────────────────

function stripTimestamps(obj) {
    const data = typeof obj.toJSON === 'function' ? obj.toJSON() : { ...obj };
    for (const field of TIMESTAMP_FIELDS) delete data[field];
    return data;
}

function ensureBuildingAccess(user, buildingId) {
    if (
        (user.role === ROLES.BUILDING_MANAGER || user.role === ROLES.STAFF) &&
        user.building_id !== buildingId
    ) {
        throw { status: 403, message: 'You can only access assets in your assigned building' };
    }
}

// ─── GET /api/assets ──────────────────────────────────────────
const getAllAssets = async (query = {}, user = {}) => {
    const { page = 1, limit = 10, building_id, current_room_id, status, search } = query;
    const offset = (page - 1) * limit;
    const where = {};

    // Building-scoped for BM and STAFF
    if (user.role === ROLES.BUILDING_MANAGER || user.role === ROLES.STAFF) {
        where.building_id = user.building_id;
    } else if (building_id) {
        where.building_id = building_id;
    }

    if (current_room_id) where.current_room_id = current_room_id;
    if (status) where.status = status.toUpperCase();
    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { qr_code: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows } = await Asset.findAndCountAll({
        where,
        include: [
            { model: Building, as: 'building', attributes: ['id', 'name'] },
            { model: Room, as: 'room', attributes: ['id', 'room_number'] }
        ],
        limit: Number(limit),
        offset: Number(offset),
        order: [['createdAt', 'DESC']]
    });

    let data = rows;
    if (user.role !== ROLES.ADMIN) {
        data = rows.map(row => stripTimestamps(row));
    }

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data
    };
};

// ─── GET /api/assets/:id ──────────────────────────────────────
const getAssetById = async (id, user = {}) => {
    const asset = await Asset.findByPk(id, {
        include: [
            { model: Building, as: 'building' },
            { model: Room, as: 'room' },
            {
                model: AssetHistory,
                as: 'histories',
                limit: 10,
                order: [['createdAt', 'DESC']]
            }
        ]
    });
    if (!asset) throw { status: 404, message: 'Asset not found' };

    ensureBuildingAccess(user, asset.building_id);

    if (user.role !== ROLES.ADMIN) {
        return stripTimestamps(asset);
    }
    return asset;
};

// ─── POST /api/assets (Admin only) ───────────────────────────
const createAsset = async (data) => {
    const transaction = await sequelize.transaction();
    try {
        // Auto-generate QR code
        data.qr_code = `FSCAPE-AST-${randomUUID()}`;

        // Validate building exists
        const building = await Building.findByPk(data.building_id);
        if (!building) throw { status: 404, message: 'Building not found' };

        // If assigning to room at creation, validate room is in same building
        if (data.current_room_id) {
            const room = await Room.findByPk(data.current_room_id);
            if (!room) throw { status: 404, message: 'Room not found' };
            if (room.building_id !== data.building_id) {
                throw { status: 400, message: 'Room does not belong to the specified building' };
            }
        }

        const asset = await Asset.create(data, { transaction });

        await AssetHistory.create({
            asset_id: asset.id,
            to_room_id: data.current_room_id || null,
            to_status: data.status || 'AVAILABLE',
            from_status: 'AVAILABLE',
            action: 'INITIAL_CREATE',
            notes: 'Tạo mới tài sản vào hệ thống'
        }, { transaction });

        await transaction.commit();
        return getAssetById(asset.id, { role: ROLES.ADMIN });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// ─── POST /api/assets/batch (Admin only) ─────────────────────
const createBatchAssets = async (data) => {
    const { name, building_id, asset_type_id, quantity = 1, price } = data;

    if (!name || !building_id) {
        throw { status: 400, message: 'name and building_id are required' };
    }
    if (!quantity || quantity < 1 || quantity > 100) {
        throw { status: 400, message: 'quantity must be between 1 and 100' };
    }

    const building = await Building.findByPk(building_id);
    if (!building) throw { status: 404, message: 'Building not found' };

    if (asset_type_id) {
        const AssetType = require('../models/assetType.model');
        const at = await AssetType.findByPk(asset_type_id);
        if (!at) throw { status: 404, message: 'Asset type not found' };
    }

    const transaction = await sequelize.transaction();
    try {
        const created = [];
        for (let i = 0; i < quantity; i++) {
            const qr_code = `FSCAPE-AST-${randomUUID()}`;
            const asset = await Asset.create({
                name,
                building_id,
                asset_type_id: asset_type_id || null,
                price: price || null,
                qr_code,
                status: 'AVAILABLE',
            }, { transaction });

            await AssetHistory.create({
                asset_id: asset.id,
                to_status: 'AVAILABLE',
                from_status: 'AVAILABLE',
                action: 'INITIAL_CREATE',
                notes: `Tạo hàng loạt (${i + 1}/${quantity})`
            }, { transaction });

            created.push(asset);
        }
        await transaction.commit();
        return { count: created.length, data: created };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// ─── PUT /api/assets/:id (Admin only) ────────────────────────
const updateAsset = async (id, data, performerId = null) => {
    const asset = await Asset.findByPk(id);
    if (!asset) throw { status: 404, message: 'Asset not found' };

    // Prevent changing qr_code
    delete data.qr_code;

    const transaction = await sequelize.transaction();
    try {
        const oldStatus = asset.status;
        const oldRoom = asset.current_room_id;

        // If changing room, validate it belongs to same building
        if (data.current_room_id && data.current_room_id !== oldRoom) {
            const room = await Room.findByPk(data.current_room_id);
            if (!room) throw { status: 404, message: 'Room not found' };
            if (room.building_id !== asset.building_id) {
                throw { status: 400, message: 'Room does not belong to the asset\'s building' };
            }
        }

        await asset.update(data, { transaction });

        if (data.status !== oldStatus || data.current_room_id !== oldRoom) {
            await AssetHistory.create({
                asset_id: asset.id,
                from_room_id: oldRoom,
                to_room_id: data.current_room_id ?? oldRoom,
                from_status: oldStatus,
                to_status: data.status || oldStatus,
                action: 'UPDATE_INFO',
                performed_by: performerId,
                notes: data.notes || 'Cập nhật thông tin tài sản'
            }, { transaction });
        }

        await transaction.commit();
        return getAssetById(id, { role: ROLES.ADMIN });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// ─── PATCH /api/assets/:id/assign (Staff, BM, Admin) ─────────
const assignAsset = async (id, { room_id, notes }, user) => {
    const asset = await Asset.findByPk(id);
    if (!asset) throw { status: 404, message: 'Asset not found' };

    ensureBuildingAccess(user, asset.building_id);

    if (asset.status === 'MAINTENANCE') {
        throw { status: 409, message: 'Cannot assign asset under maintenance' };
    }

    const oldRoom = asset.current_room_id;
    const oldStatus = asset.status;
    let action;

    const transaction = await sequelize.transaction();
    try {
        if (room_id) {
            // CHECK_IN or MOVE
            const room = await Room.findByPk(room_id);
            if (!room) throw { status: 404, message: 'Target room not found' };
            if (room.building_id !== asset.building_id) {
                throw { status: 400, message: 'Target room is not in the same building as the asset' };
            }

            if (!oldRoom) {
                action = 'CHECK_IN';
            } else if (oldRoom === room_id) {
                throw { status: 400, message: 'Asset is already in this room' };
            } else {
                action = 'MOVE';
            }

            await asset.update({ current_room_id: room_id, status: 'IN_USE' }, { transaction });
        } else {
            // CHECK_OUT
            if (!oldRoom) {
                throw { status: 400, message: 'Asset is not assigned to any room' };
            }
            action = 'CHECK_OUT';
            await asset.update({ current_room_id: null, status: 'AVAILABLE' }, { transaction });
        }

        await AssetHistory.create({
            asset_id: asset.id,
            from_room_id: oldRoom,
            to_room_id: room_id || null,
            from_status: oldStatus,
            to_status: room_id ? 'IN_USE' : 'AVAILABLE',
            action,
            performed_by: user.id,
            notes: notes || null
        }, { transaction });

        await transaction.commit();
        return getAssetById(id, user);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// ─── DELETE /api/assets/:id (Admin only) ─────────────────────
const deleteAsset = async (id) => {
    const asset = await Asset.findByPk(id);
    if (!asset) throw { status: 404, message: 'Asset not found' };

    if (asset.status === 'IN_USE') {
        throw { status: 409, message: 'Cannot delete asset currently in use. Check out first.' };
    }

    // Check if asset is referenced in active maintenance requests
    const activeRequest = await Request.findOne({
        where: {
            related_asset_id: id,
            status: { [Op.notIn]: ['COMPLETED', 'CANCELLED', 'REVIEWED'] }
        }
    });
    if (activeRequest) {
        throw { status: 409, message: 'Cannot delete asset with active maintenance requests' };
    }

    await asset.destroy();
    return { message: `Asset "${asset.name}" deleted successfully` };
};

// ─── GET /api/assets/stats ──────────────────────────────────
const getAssetStats = async () => {
    const assets = await Asset.findAll({
        attributes: ['status', 'building_id'],
        include: [{ model: Building, as: 'building', attributes: ['id', 'name'] }],
        raw: true,
        nest: true,
    });

    const byStatus = { available: 0, in_use: 0 };
    const byBuilding = {};

    for (const a of assets) {
        const key = a.status === 'IN_USE' ? 'in_use' : 'available';
        byStatus[key]++;
        const bName = a.building?.name || 'Khác';
        const bId = a.building_id;
        if (!byBuilding[bId]) byBuilding[bId] = { building_id: bId, name: bName, count: 0 };
        byBuilding[bId].count++;
    }

    return {
        total: assets.length,
        by_status: byStatus,
        by_building: Object.values(byBuilding).sort((a, b) => b.count - a.count),
    };
};

module.exports = { getAllAssets, getAssetById, createAsset, createBatchAssets, updateAsset, assignAsset, deleteAsset, getAssetStats };
