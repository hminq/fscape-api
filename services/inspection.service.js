const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Asset = require('../models/asset.model');
const AssetType = require('../models/assetType.model');
const AssetHistory = require('../models/assetHistory.model');
const AssetInspection = require('../models/assetInspection.model');
const AssetInspectionItem = require('../models/assetInspectionItem.model');
const Room = require('../models/room.model');
const RoomTypeAsset = require('../models/roomTypeAsset.model');
const Contract = require('../models/contract.model');
const User = require('../models/user.model');
const Request = require('../models/request.model');
const auditService = require('./audit.service');
const settlementService = require('./settlement.service');

const { ROLES } = require('../constants/roles');
const { REQUEST_SERVICE_BILLING_STATUS } = require('../constants/invoiceEnums');

// ─── Helpers ──────────────────────────────────────────────────

function ensureBuildingAccess(user, room) {
    if (
        (user.role === ROLES.BUILDING_MANAGER || user.role === ROLES.STAFF) &&
        user.building_id !== room.building_id
    ) {
        throw { status: 403, message: 'You can only inspect rooms in your assigned building' };
    }
}

function resolveScannedAssets(qrCodes) {
    if (!qrCodes || qrCodes.length === 0) return Promise.resolve([]);
    return Asset.findAll({
        where: { qr_code: { [Op.in]: qrCodes } },
        include: [{ model: AssetType, as: 'asset_type', attributes: ['id', 'name', 'default_price'] }]
    });
}

function findUnknownQrCodes(qrCodes, scannedAssets) {
    const found = new Set(scannedAssets.map(a => a.qr_code));
    return qrCodes.filter(qr => !found.has(qr));
}

// ─── CHECK-IN diff (type-based, against template) ─────────────
async function computeCheckInDiff(room, qrCodes) {
    const template = await RoomTypeAsset.findAll({
        where: { room_type_id: room.room_type_id },
        include: [{ model: AssetType, as: 'asset_type', attributes: ['id', 'name', 'default_price'] }]
    });

    const scannedAssets = await resolveScannedAssets(qrCodes);
    const unknownQrCodes = findUnknownQrCodes(qrCodes, scannedAssets);

    // Validate: scanned assets must not already be in another room
    const conflicts = scannedAssets.filter(a => a.current_room_id && a.current_room_id !== room.id);
    if (conflicts.length > 0) {
        const qrs = conflicts.map(a => a.qr_code).join(', ');
        throw { status: 409, message: `Assets already assigned to another room: ${qrs}` };
    }

    // Group scanned by asset_type_id
    const scannedByType = {};
    for (const asset of scannedAssets) {
        if (!asset.asset_type_id) continue;
        if (!scannedByType[asset.asset_type_id]) scannedByType[asset.asset_type_id] = [];
        scannedByType[asset.asset_type_id].push(asset);
    }

    // Compare against template
    const results = [];
    const assetsToAssign = []; // assets that match template, will be assigned to room

    for (const item of template) {
        const typeId = item.asset_type_id;
        const expected = item.quantity;
        const scanned = scannedByType[typeId] || [];
        const actual = scanned.length;

        const entry = {
            asset_type_id: typeId,
            asset_type_name: item.asset_type.name,
            expected,
            actual,
            status: actual >= expected ? 'OK' : 'SHORT',
        };

        if (actual < expected) {
            entry.shortage = expected - actual;
        }

        // Take up to `expected` assets of this type for assignment
        const toAssign = scanned.slice(0, expected);
        assetsToAssign.push(...toAssign);

        results.push(entry);
    }

    // Extra: scanned assets whose type is not in the template
    const assignedIds = new Set(assetsToAssign.map(a => a.id));
    const extra = scannedAssets
        .filter(a => !assignedIds.has(a.id))
        .map(a => ({
            id: a.id,
            qr_code: a.qr_code,
            name: a.name,
            asset_type: a.asset_type ? a.asset_type.name : null,
        }));

    return { results, assetsToAssign, extra, unknown_qr_codes: unknownQrCodes, scannedAssets };
}

// ─── CHECK-OUT diff (exact asset match, against room's assets) ─
async function computeCheckOutDiff(room, qrCodes) {
    // Assets currently linked to this room
    const expectedAssets = await Asset.findAll({
        where: { current_room_id: room.id },
        include: [{ model: AssetType, as: 'asset_type', attributes: ['id', 'name', 'default_price'] }]
    });

    const scannedAssets = await resolveScannedAssets(qrCodes);
    const unknownQrCodes = findUnknownQrCodes(qrCodes, scannedAssets);

    const scannedIds = new Set(scannedAssets.map(a => a.id));
    const expectedIds = new Set(expectedAssets.map(a => a.id));

    // Matched: in room AND scanned
    const matched = expectedAssets.filter(a => scannedIds.has(a.id));

    // Missing: in room but NOT scanned
    const missing = expectedAssets.filter(a => !scannedIds.has(a.id));

    // Extra: scanned but NOT in room
    const extra = scannedAssets
        .filter(a => !expectedIds.has(a.id))
        .map(a => ({
            id: a.id,
            qr_code: a.qr_code,
            name: a.name,
            asset_type: a.asset_type ? a.asset_type.name : null,
            current_room_id: a.current_room_id,
        }));

    // Penalty = sum of default_price for missing assets
    let penaltyTotal = 0;
    const missingDetails = missing.map(a => {
        const price = Number(a.asset_type?.default_price || a.price || 0);
        penaltyTotal += price;
        return {
            id: a.id,
            qr_code: a.qr_code,
            name: a.name,
            asset_type: a.asset_type ? a.asset_type.name : null,
            penalty: price,
        };
    });

    const matchedDetails = matched.map(a => ({
        id: a.id,
        qr_code: a.qr_code,
        name: a.name,
        asset_type: a.asset_type ? a.asset_type.name : null,
    }));

    return {
        matched: matchedDetails,
        missing: missingDetails,
        extra,
        penalty_total: penaltyTotal,
        unknown_qr_codes: unknownQrCodes,
        // Raw arrays for DB operations
        _matchedAssets: matched,
        _missingAssets: missing,
        _scannedAssets: scannedAssets,
    };
}

// ─── Shared: build conditionMap from assets input ────────────
function buildConditionMap(assetsInput) {
    const conditionMap = {};
    for (const a of assetsInput) {
        conditionMap[a.qr_code] = { condition: a.condition, note: a.note || null };
    }
    return conditionMap;
}

// ─── POST /api/inspections/preview (staff, CHECK_OUT only) ────
const previewInspection = async (roomId, assetsInput, user) => {
    const room = await Room.findByPk(roomId);
    if (!room) throw { status: 404, message: 'Room not found' };
    ensureBuildingAccess(user, room);

    const qrCodes = assetsInput.map(a => a.qr_code);
    const conditionMap = buildConditionMap(assetsInput);
    const diff = await computeCheckOutDiff(room, qrCodes);

    // Split matched into GOOD and BROKEN based on reported condition
    let brokenPenalty = 0;
    const conditionSummary = diff._scannedAssets
        .filter(a => diff._matchedAssets.some(m => m.id === a.id))
        .map(asset => {
            const cond = conditionMap[asset.qr_code]?.condition || 'GOOD';
            const note = conditionMap[asset.qr_code]?.note || null;
            const price = Number(asset.asset_type?.default_price || asset.price || 0);
            if (cond === 'BROKEN') brokenPenalty += price;
            return {
                qr_code: asset.qr_code,
                asset_id: asset.id,
                asset_type_name: asset.asset_type ? asset.asset_type.name : null,
                condition: cond,
                note,
                penalty: cond === 'BROKEN' ? price : 0
            };
        });

    const totalPenalty = diff.penalty_total + brokenPenalty;

    // ── Settlement preview (contract + unbilled services + deposit) ──
    let settlementPreview = null;

    const contract = await Contract.findOne({
        where: {
            room_id: room.id,
            status: { [Op.in]: ['ACTIVE', 'EXPIRING_SOON', 'FINISHED'] }
        },
        order: [['created_at', 'DESC']]
    });

    if (contract) {
        const depositOriginal = Number(contract.deposit_original_amount || contract.deposit_amount);
        const depositBefore = Number(contract.deposit_amount);

        // Query unbilled service requests
        const unbilledRequests = await Request.findAll({
            where: {
                room_id: room.id,
                status: { [Op.in]: ['COMPLETED', 'DONE'] },
                service_billing_status: REQUEST_SERVICE_BILLING_STATUS.UNBILLED,
                request_price: { [Op.gt]: 0 }
            }
        });

        const totalUnbilledService = unbilledRequests.reduce(
            (sum, req) => sum + Number(req.request_price || 0), 0
        );

        const totalDeductions = totalPenalty + totalUnbilledService;
        const amountRefund = Math.max(0, depositBefore - totalDeductions);
        const amountDue = Math.max(0, totalDeductions - depositBefore);

        settlementPreview = {
            contract_id: contract.id,
            contract_number: contract.contract_number,
            deposit_original_amount: depositOriginal,
            deposit_balance_before: depositBefore,
            total_penalty_amount: totalPenalty,
            total_unbilled_service_amount: totalUnbilledService,
            amount_refund_to_resident: amountRefund,
            amount_due_from_resident: amountDue,
            unbilled_requests: unbilledRequests.map(r => ({
                id: r.id,
                request_number: r.request_number,
                request_type: r.request_type,
                title: r.title,
                price: Number(r.request_price)
            }))
        };
    }

    return {
        type: 'CHECK_OUT',
        matched: diff.matched,
        missing: diff.missing,
        condition_summary: conditionSummary,
        extra: diff.extra,
        penalty_total: totalPenalty,
        missing_penalty: diff.penalty_total,
        broken_penalty: brokenPenalty,
        settlement_preview: settlementPreview,
        unknown_qr_codes: diff.unknown_qr_codes
    };
};

// ─── POST /api/inspections (staff, CHECK_OUT only) ───────────
const confirmInspection = async (roomId, assetsInput, notes, user) => {
    const room = await Room.findByPk(roomId);
    if (!room) throw { status: 404, message: 'Room not found' };
    ensureBuildingAccess(user, room);

    return confirmCheckOut(room, assetsInput, notes, user);
};

// ─── CHECK-OUT: unassign all, BROKEN → MAINTENANCE, deduct deposit ─
async function confirmCheckOut(room, assetsInput, notes, user) {
    const qrCodes = assetsInput.map(a => a.qr_code);
    const conditionMap = buildConditionMap(assetsInput);
    const diff = await computeCheckOutDiff(room, qrCodes);

    // Split matched assets by condition
    const matchedGood = [];
    const matchedBroken = [];
    let brokenPenalty = 0;

    for (const asset of diff._matchedAssets) {
        const cond = conditionMap[asset.qr_code]?.condition || 'GOOD';
        if (cond === 'BROKEN') {
            const price = Number(asset.asset_type?.default_price || asset.price || 0);
            brokenPenalty += price;
            matchedBroken.push(asset);
        } else {
            matchedGood.push(asset);
        }
    }

    const totalPenalty = diff.penalty_total + brokenPenalty;
    const hasDiscrepancy = diff.missing.length > 0 || matchedBroken.length > 0;

    const transaction = await sequelize.transaction();
    try {
        const inspection = await AssetInspection.create({
            room_id: room.id,
            performed_by: user.id,
            type: 'CHECK_OUT',
            status: hasDiscrepancy ? 'SETTLED' : 'NO_DISCREPANCY',
            penalty_total: totalPenalty,
            notes
        }, { transaction });

        // ── AssetInspectionItem records for all scanned assets ──
        const itemRows = diff._scannedAssets.map(asset => ({
            inspection_id: inspection.id,
            asset_id: asset.id,
            qr_code: asset.qr_code,
            condition: conditionMap[asset.qr_code]?.condition || 'GOOD',
            note: conditionMap[asset.qr_code]?.note || null
        }));
        const items = await AssetInspectionItem.bulkCreate(itemRows, { transaction });

        // ── Asset history rows ──
        const historyRows = [];

        for (const asset of matchedGood) {
            historyRows.push({
                asset_id: asset.id,
                from_room_id: room.id,
                to_room_id: null,
                from_status: asset.status,
                to_status: 'AVAILABLE',
                action: 'CHECK_OUT',
                performed_by: user.id,
                notes: `inspection:${inspection.id}`
            });
        }

        for (const asset of matchedBroken) {
            historyRows.push({
                asset_id: asset.id,
                from_room_id: room.id,
                to_room_id: null,
                from_status: asset.status,
                to_status: 'MAINTENANCE',
                action: 'INSPECTION_BROKEN',
                performed_by: user.id,
                notes: `inspection:${inspection.id}`
            });
        }

        for (const asset of diff._missingAssets) {
            historyRows.push({
                asset_id: asset.id,
                from_room_id: room.id,
                to_room_id: null,
                from_status: asset.status,
                to_status: 'MAINTENANCE',
                action: 'INSPECTION_MISSING',
                performed_by: user.id,
                notes: `inspection:${inspection.id}`
            });
        }

        if (historyRows.length > 0) {
            await AssetHistory.bulkCreate(historyRows, { transaction });
        }

        // ── Update asset statuses ──
        const goodIds = matchedGood.map(a => a.id);
        if (goodIds.length > 0) {
            await Asset.update(
                { current_room_id: null, status: 'AVAILABLE' },
                { where: { id: { [Op.in]: goodIds } }, transaction }
            );
        }

        const brokenIds = matchedBroken.map(a => a.id);
        const missingIds = diff._missingAssets.map(a => a.id);
        const maintenanceIds = [...brokenIds, ...missingIds];
        if (maintenanceIds.length > 0) {
            await Asset.update(
                { current_room_id: null, status: 'MAINTENANCE' },
                { where: { id: { [Op.in]: maintenanceIds } }, transaction }
            );
        }

        // ── Contract lookup (always, for deposit info + status update) ──
        const contract = await Contract.findOne({
            where: {
                room_id: room.id,
                status: { [Op.in]: ['ACTIVE', 'EXPIRING_SOON', 'FINISHED'] }
            },
            order: [['created_at', 'DESC']],
            transaction
        });

        let depositInfo = null;
        let settlement = null;

        if (contract) {
            const originalDeposit = Number(contract.deposit_amount);
            const penalty = hasDiscrepancy ? totalPenalty : 0;
            const finalDeposit = originalDeposit - penalty;

            // ── Create Settlement record ──
            settlement = await settlementService.createCheckoutSettlement(
                contract,
                {
                    missingAssets: diff._missingAssets,
                    brokenAssets: matchedBroken,
                    missingPenalty: diff.penalty_total,
                    brokenPenalty,
                    totalPenalty: penalty
                },
                user,
                transaction
            );

            // Deduct deposit (keep for backward compatibility)
            if (hasDiscrepancy) {
                await contract.update({ deposit_amount: finalDeposit }, { transaction });

                await auditService.log({
                    user,
                    action: 'UPDATE',
                    entityType: 'contract',
                    entityId: contract.id,
                    oldValue: { deposit_amount: originalDeposit },
                    newValue: { deposit_amount: finalDeposit, penalty_from_inspection: inspection.id, settlement_id: settlement.id },
                }, { transaction });
            }

            // Contract → FINISHED
            await contract.update({ status: 'FINISHED' }, { transaction });

            // RESIDENT → CUSTOMER if no other active contracts
            const otherActive = await Contract.count({
                where: {
                    customer_id: contract.customer_id,
                    id: { [Op.ne]: contract.id },
                    status: { [Op.in]: ['ACTIVE', 'EXPIRING_SOON'] }
                },
                transaction
            });
            if (otherActive === 0) {
                await User.update(
                    { role: 'CUSTOMER' },
                    { where: { id: contract.customer_id, role: 'RESIDENT' }, transaction }
                );
            }

            depositInfo = {
                contract_id: contract.id,
                contract_number: contract.contract_number,
                original_deposit: originalDeposit,
                penalty_deducted: penalty,
                final_deposit: finalDeposit,
                deficit: finalDeposit < 0,
                settlement_id: settlement.id,
            };
        }

        // Room → AVAILABLE
        await Room.update(
            { status: 'AVAILABLE' },
            { where: { id: room.id }, transaction }
        );

        await transaction.commit();

        // Build condition summary for response
        const conditionSummary = diff._scannedAssets
            .filter(a => diff._matchedAssets.some(m => m.id === a.id))
            .map(asset => {
                const cond = conditionMap[asset.qr_code]?.condition || 'GOOD';
                const price = Number(asset.asset_type?.default_price || asset.price || 0);
                return {
                    qr_code: asset.qr_code,
                    asset_id: asset.id,
                    asset_type_name: asset.asset_type ? asset.asset_type.name : null,
                    condition: cond,
                    note: conditionMap[asset.qr_code]?.note || null,
                    penalty: cond === 'BROKEN' ? price : 0
                };
            });

        return {
            inspection: inspection.toJSON(),
            items: items.map(i => i.toJSON()),
            matched: diff.matched,
            missing: diff.missing,
            condition_summary: conditionSummary,
            extra: diff.extra,
            penalty_total: totalPenalty,
            missing_penalty: diff.penalty_total,
            broken_penalty: brokenPenalty,
            deposit_info: depositInfo,
            settlement,
            unknown_qr_codes: diff.unknown_qr_codes
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

// ─── RESIDENT SELF-SERVICE CHECK-IN ──────────────────────────

async function resolveResidentContract(user) {
    const contract = await Contract.findOne({
        where: {
            customer_id: user.id,
            status: { [Op.in]: ['ACTIVE', 'EXPIRING_SOON'] }
        },
        include: [{ model: Room, as: 'room' }],
        order: [['created_at', 'DESC']]
    });

    if (!contract || !contract.room) {
        throw { status: 403, message: 'No active contract found' };
    }

    return { contract, room: contract.room };
}

const residentPreviewCheckIn = async (assetsInput, user) => {
    const { contract, room } = await resolveResidentContract(user);

    const qrCodes = assetsInput.map(a => a.qr_code);
    const conditionMap = {};
    for (const a of assetsInput) {
        conditionMap[a.qr_code] = { condition: a.condition, note: a.note || null };
    }

    const { results, extra, unknown_qr_codes, scannedAssets } = await computeCheckInDiff(room, qrCodes);

    // Build condition summary from scanned assets
    const conditionSummary = scannedAssets.map(asset => ({
        qr_code: asset.qr_code,
        asset_id: asset.id,
        asset_type_name: asset.asset_type ? asset.asset_type.name : null,
        condition: conditionMap[asset.qr_code]?.condition || 'GOOD',
        note: conditionMap[asset.qr_code]?.note || null
    }));

    // Check failures
    const failureReasons = [];

    const shortItems = results.filter(r => r.status === 'SHORT');
    for (const item of shortItems) {
        failureReasons.push(`${item.asset_type_name}: cần ${item.expected}, scan ${item.actual}`);
    }

    const brokenItems = conditionSummary.filter(c => c.condition === 'BROKEN');
    for (const item of brokenItems) {
        failureReasons.push(`${item.asset_type_name} (${item.qr_code}): tình trạng BROKEN${item.note ? ' — ' + item.note : ''}`);
    }

    const canCheckIn = shortItems.length === 0 && brokenItems.length === 0;

    return {
        type: 'CHECK_IN',
        room_id: room.id,
        contract_id: contract.id,
        template_comparison: results,
        condition_summary: conditionSummary,
        can_check_in: canCheckIn,
        failure_reasons: failureReasons,
        extra_assets: extra,
        unknown_qr_codes
    };
};

const residentConfirmCheckIn = async (assetsInput, notes, user) => {
    const { contract, room } = await resolveResidentContract(user);

    const qrCodes = assetsInput.map(a => a.qr_code);
    const conditionMap = {};
    for (const a of assetsInput) {
        conditionMap[a.qr_code] = { condition: a.condition, note: a.note || null };
    }

    const { results, assetsToAssign, extra, unknown_qr_codes, scannedAssets } = await computeCheckInDiff(room, qrCodes);

    // Validate: no SHORT items
    const failureReasons = [];

    const shortItems = results.filter(r => r.status === 'SHORT');
    for (const item of shortItems) {
        failureReasons.push(`${item.asset_type_name}: cần ${item.expected}, scan ${item.actual}`);
    }

    // Build condition summary
    const conditionSummary = scannedAssets.map(asset => ({
        qr_code: asset.qr_code,
        asset_id: asset.id,
        asset_type_name: asset.asset_type ? asset.asset_type.name : null,
        condition: conditionMap[asset.qr_code]?.condition || 'GOOD',
        note: conditionMap[asset.qr_code]?.note || null
    }));

    const brokenItems = conditionSummary.filter(c => c.condition === 'BROKEN');
    for (const item of brokenItems) {
        failureReasons.push(`${item.asset_type_name} (${item.qr_code}): tình trạng BROKEN${item.note ? ' — ' + item.note : ''}`);
    }

    if (failureReasons.length > 0) {
        throw {
            status: 400,
            message: 'Check-in thất bại',
            data: {
                failure_reasons: failureReasons,
                template_comparison: results,
                condition_summary: conditionSummary
            }
        };
    }

    const transaction = await sequelize.transaction();
    try {
        const inspection = await AssetInspection.create({
            room_id: room.id,
            performed_by: user.id,
            type: 'CHECK_IN',
            status: 'NO_DISCREPANCY',
            penalty_total: 0,
            notes
        }, { transaction });

        // Create per-asset condition items
        const itemRows = scannedAssets.map(asset => ({
            inspection_id: inspection.id,
            asset_id: asset.id,
            qr_code: asset.qr_code,
            condition: conditionMap[asset.qr_code]?.condition || 'GOOD',
            note: conditionMap[asset.qr_code]?.note || null
        }));
        const items = await AssetInspectionItem.bulkCreate(itemRows, { transaction });

        // Assign assets to room
        if (assetsToAssign.length > 0) {
            const assetIds = assetsToAssign.map(a => a.id);
            await Asset.update(
                { current_room_id: room.id, status: 'IN_USE' },
                { where: { id: { [Op.in]: assetIds } }, transaction }
            );

            const historyRows = assetsToAssign.map(asset => ({
                asset_id: asset.id,
                from_room_id: asset.current_room_id,
                to_room_id: room.id,
                from_status: asset.status,
                to_status: 'IN_USE',
                action: 'CHECK_IN',
                performed_by: user.id,
                notes: `inspection:${inspection.id}`
            }));
            await AssetHistory.bulkCreate(historyRows, { transaction });
        }

        await transaction.commit();

        return {
            inspection: inspection.toJSON(),
            items: items.map(i => i.toJSON()),
            assets_assigned: assetsToAssign.length,
            room_id: room.id
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

module.exports = { previewInspection, confirmInspection, residentPreviewCheckIn, residentConfirmCheckIn };
