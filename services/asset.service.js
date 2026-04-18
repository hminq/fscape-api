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
        throw { status: 403, message: 'Bạn chỉ có thể truy cập tài sản trong tòa nhà được phân công' };
    }
}

function toPlain(record) {
    return typeof record?.toJSON === 'function' ? record.toJSON() : record;
}

function getFloorKey(asset) {
    return asset.room?.floor == null ? 'storage' : String(asset.room.floor);
}

function buildStorageStacks(assets) {
    const map = new Map();
    for (const asset of assets) {
        const typeId = asset.asset_type?.id || asset.asset_type_id || 'unknown';
        const typeName = asset.asset_type?.name || 'Tài sản';
        if (!map.has(typeId)) {
            map.set(typeId, {
                asset_type_id: typeId,
                asset_type_name: typeName,
                count: 0,
                assets: [],
            });
        }
        const stack = map.get(typeId);
        stack.count += 1;
        stack.assets.push(asset);
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.asset_type_name.localeCompare(b.asset_type_name));
}

function buildBuildingHierarchy(rows) {
    const buildingMap = new Map();

    for (const row of rows) {
        const asset = toPlain(row);
        const buildingId = asset.building_id;
        const buildingName = asset.building?.name || 'Khác';
        if (!buildingMap.has(buildingId)) {
            buildingMap.set(buildingId, {
                building_id: buildingId,
                name: buildingName,
                total_assets: 0,
                storage_total: 0,
                floors: new Map(),
            });
        }

        const building = buildingMap.get(buildingId);
        building.total_assets += 1;

        const floorKey = getFloorKey(asset);
        if (!building.floors.has(floorKey)) {
            building.floors.set(floorKey, {
                floor_key: floorKey,
                floor: floorKey === 'storage' ? null : Number(floorKey),
                total_assets: 0,
                rooms: new Map(),
                storage: [],
            });
        }

        const floor = building.floors.get(floorKey);
        floor.total_assets += 1;

        if (floorKey === 'storage') {
            floor.storage.push(asset);
            building.storage_total += 1;
            continue;
        }

        const roomId = asset.room?.id || 'unknown-room';
        if (!floor.rooms.has(roomId)) {
            floor.rooms.set(roomId, {
                room_id: roomId,
                room_number: asset.room?.room_number || '—',
                assets: [],
            });
        }
        floor.rooms.get(roomId).assets.push(asset);
    }

    return [...buildingMap.values()]
        .map((building) => {
            const floors = [...building.floors.values()]
                .sort((a, b) => {
                    if (a.floor_key === 'storage') return -1;
                    if (b.floor_key === 'storage') return 1;
                    return Number(a.floor) - Number(b.floor);
                })
                .map((floor) => ({
                    floor_key: floor.floor_key,
                    floor: floor.floor,
                    total_assets: floor.total_assets,
                    storage_stacks: floor.floor_key === 'storage' ? buildStorageStacks(floor.storage) : [],
                    rooms: [...floor.rooms.values()].map((room) => ({
                        room_id: room.room_id,
                        room_number: room.room_number,
                        assets: room.assets,
                    })),
                }));

            return {
                building_id: building.building_id,
                name: building.name,
                total_assets: building.total_assets,
                storage_total: building.storage_total,
                floors,
            };
        })
        .sort((a, b) => b.total_assets - a.total_assets || a.name.localeCompare(b.name));
}

// ─── GET /api/assets ──────────────────────────────────────────
const getAllAssets = async (query = {}, user = {}) => {
    const { page = 1, limit = 10, building_id, current_room_id, status, search, grouped } = query;
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

    const include = [
        { model: Building, as: 'building', attributes: ['id', 'name'] },
        { model: Room, as: 'room', attributes: ['id', 'room_number', 'floor', 'building_id'] },
        { model: require('../models/assetType.model'), as: 'asset_type', attributes: ['id', 'name'] }
    ];

    if (grouped === 'true' || grouped === true) {
        const rows = await Asset.findAll({
            where,
            include,
            order: [
                [{ model: Building, as: 'building' }, 'name', 'ASC'],
                [{ model: Room, as: 'room' }, 'floor', 'ASC'],
                ['createdAt', 'DESC']
            ]
        });

        const data = buildBuildingHierarchy(rows);
        const total = data.length;
        const offset = (page - 1) * limit;
        const paged = data.slice(offset, offset + Number(limit));

        return {
            total,
            page: Number(page),
            limit: Number(limit),
            current_page: Number(page),
            per_page: Number(limit),
            totalPages: Math.ceil(total / limit),
            total_pages: Math.ceil(total / limit),
            data: paged
        };
    }

    const { count, rows } = await Asset.findAndCountAll({
        where,
        include,
        distinct: true,
        limit: Number(limit),
        offset: (page - 1) * limit,
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
        current_page: Number(page),
        per_page: Number(limit),
        totalPages: Math.ceil(count / limit),
        total_pages: Math.ceil(count / limit),
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
    if (!asset) throw { status: 404, message: 'Không tìm thấy tài sản' };

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
        if (!building) throw { status: 404, message: 'Không tìm thấy tòa nhà' };

        // If assigning to room at creation, validate room is in same building
        if (data.current_room_id) {
            const room = await Room.findByPk(data.current_room_id);
            if (!room) throw { status: 404, message: 'Không tìm thấy phòng' };
            if (room.building_id !== data.building_id) {
                throw { status: 400, message: 'Phòng không thuộc tòa nhà được chỉ định' };
            }
        }

        // Auto-fill price from AssetType if not provided
        if (!data.price && data.asset_type_id) {
            const AssetType = require('../models/assetType.model');
            const at = await AssetType.findByPk(data.asset_type_id);
            if (at && at.default_price) {
                data.price = at.default_price;
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
        throw { status: 400, message: 'Tên và mã tòa nhà là bắt buộc' };
    }
    if (!quantity || quantity < 1 || quantity > 100) {
        throw { status: 400, message: 'Số lượng phải từ 1 đến 100' };
    }

    const building = await Building.findByPk(building_id);
    if (!building) throw { status: 404, message: 'Không tìm thấy tòa nhà' };

    let resolvedPrice = price || null;
    if (asset_type_id) {
        const AssetType = require('../models/assetType.model');
        const at = await AssetType.findByPk(asset_type_id);
        if (!at) throw { status: 404, message: 'Không tìm thấy loại tài sản' };
        if (!resolvedPrice && at.default_price) {
            resolvedPrice = at.default_price;
        }
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
                price: resolvedPrice,
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
    if (!asset) throw { status: 404, message: 'Không tìm thấy tài sản' };

    // Prevent changing qr_code
    delete data.qr_code;

    const transaction = await sequelize.transaction();
    try {
        const oldStatus = asset.status;
        const oldRoom = asset.current_room_id;

        // If changing room, validate it belongs to same building
        if (data.current_room_id && data.current_room_id !== oldRoom) {
            const room = await Room.findByPk(data.current_room_id);
            if (!room) throw { status: 404, message: 'Không tìm thấy phòng' };
            if (room.building_id !== asset.building_id) {
                throw { status: 400, message: 'Phòng không thuộc tòa nhà của tài sản' };
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
    if (!asset) throw { status: 404, message: 'Không tìm thấy tài sản' };

    ensureBuildingAccess(user, asset.building_id);

    if (asset.status === 'MAINTENANCE') {
        throw { status: 409, message: 'Không thể gán tài sản đang bảo trì' };
    }

    const oldRoom = asset.current_room_id;
    const oldStatus = asset.status;
    let action;

    const transaction = await sequelize.transaction();
    try {
        if (room_id) {
            // CHECK_IN only: storage -> room
            const room = await Room.findByPk(room_id);
            if (!room) throw { status: 404, message: 'Không tìm thấy phòng đích' };
            if (room.building_id !== asset.building_id) {
                throw { status: 400, message: 'Phòng đích không cùng tòa nhà với tài sản' };
            }

            if (!oldRoom) {
                action = 'CHECK_IN';
            } else if (oldRoom === room_id) {
                throw { status: 400, message: 'Tài sản đã ở trong phòng này' };
            } else {
                throw { status: 400, message: 'Không thể chuyển trực tiếp tài sản giữa hai phòng. Vui lòng thu hồi về kho trước.' };
            }

            await asset.update({ current_room_id: room_id, status: 'IN_USE' }, { transaction });
        } else {
            // CHECK_OUT
            if (!oldRoom) {
                throw { status: 400, message: 'Tài sản chưa được gán cho phòng nào' };
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
    if (!asset) throw { status: 404, message: 'Không tìm thấy tài sản' };

    if (asset.status === 'IN_USE') {
        throw { status: 409, message: 'Không thể xóa tài sản đang sử dụng. Vui lòng thu hồi trước.' };
    }

    // Check if asset is referenced in active maintenance requests
    const activeRequest = await Request.findOne({
        where: {
            related_asset_id: id,
            status: { [Op.notIn]: ['COMPLETED', 'CANCELLED', 'REVIEWED'] }
        }
    });
    if (activeRequest) {
        throw { status: 409, message: 'Không thể xóa tài sản có yêu cầu bảo trì đang hoạt động' };
    }

    await asset.destroy();
    return { message: `Đã xóa tài sản "${asset.name}" thành công` };
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
