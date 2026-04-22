const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const Settlement = require('../models/settlement.model');
const SettlementItem = require('../models/settlementItem.model');
const Contract = require('../models/contract.model');
const User = require('../models/user.model');
const Room = require('../models/room.model');
const Building = require('../models/building.model');
const Request = require('../models/request.model');
const auditService = require('./audit.service');
const { SETTLEMENT_STATUS, SETTLEMENT_ITEM_TYPE, EARLY_CHECKOUT_DEPOSIT_PENALTY_RATE } = require('../constants/settlementEnums');
const { REQUEST_SERVICE_BILLING_STATUS } = require('../constants/invoiceEnums');
const { billingCycleToMonths, isAllInBillingCycle } = require('../utils/billingCycle.util');
const { ROLES } = require('../constants/roles');

const getScopedSettlementQuery = (user, baseWhere = {}) => {
    if (user.role === ROLES.ADMIN) {
        return { where: baseWhere, scopedBuildingId: null };
    }

    if (user.role === ROLES.STAFF) {
        return {
            where: { ...baseWhere, created_by: user.id },
            scopedBuildingId: null
        };
    }

    if (!user.building_id) {
        throw { status: 403, message: 'Tài khoản chưa được gán tòa nhà' };
    }

    return { where: baseWhere, scopedBuildingId: user.building_id };
};

const buildContractInclude = ({ scopedBuildingId, required = false } = {}) => ({
    model: Contract,
    as: 'contract',
    attributes: ['id', 'contract_number', 'room_id'],
    required,
    include: [{
        model: Room,
        as: 'room',
        attributes: ['id', 'room_number'],
        ...(scopedBuildingId ? { required: true } : {}),
        include: [{
            model: Building,
            as: 'building',
            attributes: ['id', 'name'],
            ...(scopedBuildingId ? { where: { id: scopedBuildingId }, required: true } : {})
        }]
    }]
});

/**
 * Create a settlement record during checkout.
 *
 * @param {Object} contract - Sequelize Contract instance
 * @param {Object} penaltyData - { missingAssets, brokenAssets, missingPenalty, brokenPenalty, totalPenalty }
 * @param {Object} user - Staff performing checkout
 * @param {Object} transaction - Sequelize transaction
 * @returns {Object} settlement with items
 */
const createCheckoutSettlement = async (contract, penaltyData, user, transaction) => {
    // Query unbilled service requests.
    const unbilledRequests = await Request.findAll({
        where: {
            room_id: contract.room_id,
            status: { [Op.in]: ['COMPLETED', 'DONE'] },
            service_billing_status: REQUEST_SERVICE_BILLING_STATUS.UNBILLED,
            request_price: { [Op.gt]: 0 }
        },
        transaction
    });

    const totalUnbilledService = unbilledRequests.reduce(
        (sum, req) => sum + Number(req.request_price || 0), 0
    );

    // Early checkout penalty: 50% of original deposit when checkout before end_date.
    // Exempt only when billing cycle covers the entire contract in a single payment:
    //   ALL_IN, or cycle months >= duration_months (e.g. CYCLE_6M + 6-month contract).
    const depositOriginal = Number(contract.deposit_original_amount || contract.deposit_amount);
    const today = new Date().toISOString().split('T')[0];
    const isBeforeEndDate = contract.end_date && today < contract.end_date;

    let earlyCheckoutPenalty = 0;
    if (isBeforeEndDate) {
        const cycleMonths = billingCycleToMonths(contract.billing_cycle);
        const paidFullUpfront = isAllInBillingCycle(contract.billing_cycle)
            || (cycleMonths != null && cycleMonths >= Number(contract.duration_months));

        if (!paidFullUpfront) {
            earlyCheckoutPenalty = Math.round(depositOriginal * EARLY_CHECKOUT_DEPOSIT_PENALTY_RATE);
        }
    }

    // Calculate settlement amounts.
    const depositBefore = Number(contract.deposit_amount);
    const totalPenalty = penaltyData.totalPenalty;
    const totalDeductions = totalPenalty + totalUnbilledService + earlyCheckoutPenalty;

    const amountRefund = Math.max(0, depositBefore - totalDeductions);
    const amountDue = Math.max(0, totalDeductions - depositBefore);

    // Create settlement record.
    const settlement = await Settlement.create({
        contract_id: contract.id,
        resident_id: contract.customer_id,
        status: SETTLEMENT_STATUS.FINALIZED,
        deposit_original_amount: depositOriginal,
        deposit_balance_before: depositBefore,
        total_penalty_amount: totalPenalty + earlyCheckoutPenalty,
        total_unbilled_service_amount: totalUnbilledService,
        amount_due_from_resident: amountDue,
        amount_refund_to_resident: amountRefund,
        finalized_at: new Date(),
        created_by: user.id
    }, { transaction });

    // Create settlement items.
    const items = [];

    // Missing asset penalties
    for (const asset of penaltyData.missingAssets) {
        const price = Number(asset.asset_type?.default_price || asset.price || 0);
        if (price > 0) {
            items.push({
                settlement_id: settlement.id,
                item_type: SETTLEMENT_ITEM_TYPE.ASSET_PENALTY,
                reference_type: 'Asset',
                reference_id: asset.id,
                description: `Thiếu tài sản: ${asset.name || asset.asset_type?.name || ''} (${asset.qr_code})`,
                quantity: 1,
                unit_amount: price,
                amount: price,
                metadata: { reason: 'MISSING', qr_code: asset.qr_code }
            });
        }
    }

    // Broken asset penalties
    for (const asset of penaltyData.brokenAssets) {
        const price = Number(asset.asset_type?.default_price || asset.price || 0);
        if (price > 0) {
            items.push({
                settlement_id: settlement.id,
                item_type: SETTLEMENT_ITEM_TYPE.ASSET_PENALTY,
                reference_type: 'Asset',
                reference_id: asset.id,
                description: `Hư hỏng tài sản: ${asset.name || asset.asset_type?.name || ''} (${asset.qr_code})`,
                quantity: 1,
                unit_amount: price,
                amount: price,
                metadata: { reason: 'BROKEN', qr_code: asset.qr_code }
            });
        }
    }

    // Early checkout penalty
    if (earlyCheckoutPenalty > 0) {
        items.push({
            settlement_id: settlement.id,
            item_type: SETTLEMENT_ITEM_TYPE.EARLY_CHECKOUT,
            reference_type: 'Contract',
            reference_id: contract.id,
            description: `Phạt trả phòng trước hạn (${EARLY_CHECKOUT_DEPOSIT_PENALTY_RATE * 100}% tiền cọc)`,
            quantity: 1,
            unit_amount: earlyCheckoutPenalty,
            amount: earlyCheckoutPenalty,
            metadata: { end_date: contract.end_date, checkout_date: new Date().toISOString() }
        });
    }

    // Unbilled service requests
    for (const req of unbilledRequests) {
        const price = Number(req.request_price);
        items.push({
            settlement_id: settlement.id,
            item_type: SETTLEMENT_ITEM_TYPE.UNBILLED_SERVICE,
            reference_type: 'Request',
            reference_id: req.id,
            description: `Phí dịch vụ: ${req.title || req.request_type} (#${req.request_number || req.id})`,
            quantity: 1,
            unit_amount: price,
            amount: price,
            metadata: { request_type: req.request_type }
        });
    }

    // Deposit offset (negative amount showing deposit applied)
    const depositUsed = Math.min(depositBefore, totalDeductions);
    if (depositUsed > 0) {
        items.push({
            settlement_id: settlement.id,
            item_type: SETTLEMENT_ITEM_TYPE.DEPOSIT_OFFSET,
            reference_type: 'Contract',
            reference_id: contract.id,
            description: 'Khấu trừ tiền cọc',
            quantity: 1,
            unit_amount: -depositUsed,
            amount: -depositUsed,
            metadata: {}
        });
    }

    let createdItems = [];
    if (items.length > 0) {
        createdItems = await SettlementItem.bulkCreate(items, { transaction });
    }

    // Mark unbilled requests as SETTLED.
    if (unbilledRequests.length > 0) {
        const requestIds = unbilledRequests.map(r => r.id);
        await Request.update(
            {
                service_billing_status: REQUEST_SERVICE_BILLING_STATUS.SETTLED,
                service_billed_at: new Date()
            },
            { where: { id: { [Op.in]: requestIds } }, transaction }
        );
    }

    const result = settlement.toJSON();
    result.items = createdItems.map(i => i.toJSON());
    return result;
};

/**
 * List all settlements with pagination, status filter, search, and BM scoping.
 */
const getAllSettlements = async ({ page = 1, limit = 10, status, search } = {}, user) => {
    const offset = (page - 1) * limit;
    const baseWhere = {};

    if (status) {
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
        baseWhere.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
    }

    const { where, scopedBuildingId } = getScopedSettlementQuery(user, baseWhere);
    const contractInclude = buildContractInclude({ scopedBuildingId, required: Boolean(scopedBuildingId) });

    if (search) {
        contractInclude.where = { contract_number: { [Op.iLike]: `%${search}%` } };
        contractInclude.required = true;
    }

    const { count, rows } = await Settlement.findAndCountAll({
        where,
        include: [
            contractInclude,
            { model: User, as: 'resident', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
            { model: SettlementItem, as: 'items', attributes: ['id'] }
        ],
        order: [['finalized_at', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
        distinct: true,
        subQuery: false
    });

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows
    };
};

/**
 * Get settlement by ID.
 */
const getSettlement = async (settlementId, user) => {
    const { where, scopedBuildingId } = getScopedSettlementQuery(user, { id: settlementId });

    const settlement = await Settlement.findOne({
        where,
        include: [
            { model: SettlementItem, as: 'items' },
            buildContractInclude({ scopedBuildingId, required: Boolean(scopedBuildingId) }),
            { model: User, as: 'resident', attributes: ['id', 'email', 'first_name', 'last_name'] },
            { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }
        ]
    });

    if (!settlement) {
        throw { status: 404, message: 'Không tìm thấy quyết toán' };
    }

    return settlement;
};

/**
 * Get settlement by contract ID.
 */
const getSettlementByContract = async (contract_id, user) => {
    const { where, scopedBuildingId } = getScopedSettlementQuery(user, { contract_id });

    const settlement = await Settlement.findOne({
        where,
        include: [
            { model: SettlementItem, as: 'items' },
            buildContractInclude({ scopedBuildingId, required: Boolean(scopedBuildingId) }),
            { model: User, as: 'resident', attributes: ['id', 'email', 'first_name', 'last_name'] },
            { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }
        ]
    });

    if (!settlement) {
        throw { status: 404, message: 'Không tìm thấy quyết toán cho hợp đồng này' };
    }

    return settlement;
};

/**
 * Close a settlement after offline money exchange.
 */
const closeSettlement = async (settlementId, user) => {
    const settlement = await getSettlement(settlementId, user);

    if (!settlement) {
        throw { status: 404, message: 'Không tìm thấy quyết toán' };
    }

    if (settlement.status !== SETTLEMENT_STATUS.FINALIZED) {
        throw { status: 400, message: 'Chỉ có thể đóng quyết toán đang chờ xử lý' };
    }

    await settlement.update({
        status: SETTLEMENT_STATUS.CLOSED,
        closed_at: new Date()
    });

    await auditService.log({
        user,
        action: 'UPDATE',
        entityType: 'settlement',
        entityId: settlement.id,
        oldValue: { status: SETTLEMENT_STATUS.FINALIZED },
        newValue: { status: SETTLEMENT_STATUS.CLOSED }
    });

    return settlement;
};

module.exports = { createCheckoutSettlement, getAllSettlements, getSettlement, getSettlementByContract, closeSettlement };
