const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const Settlement = require('../models/settlement.model');
const SettlementItem = require('../models/settlementItem.model');
const Contract = require('../models/contract.model');
const User = require('../models/user.model');
const Request = require('../models/request.model');
const auditService = require('./audit.service');
const { SETTLEMENT_STATUS, SETTLEMENT_ITEM_TYPE } = require('../constants/settlementEnums');
const { REQUEST_SERVICE_BILLING_STATUS } = require('../constants/invoiceEnums');

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
    // ── Query unbilled service requests ──
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

    // ── Calculate amounts ──
    const depositOriginal = Number(contract.deposit_original_amount || contract.deposit_amount);
    const depositBefore = Number(contract.deposit_amount);
    const totalPenalty = penaltyData.totalPenalty;
    const totalDeductions = totalPenalty + totalUnbilledService;

    const amountRefund = Math.max(0, depositBefore - totalDeductions);
    const amountDue = Math.max(0, totalDeductions - depositBefore);

    // ── Create Settlement ──
    const settlement = await Settlement.create({
        contract_id: contract.id,
        resident_id: contract.customer_id,
        status: SETTLEMENT_STATUS.FINALIZED,
        deposit_original_amount: depositOriginal,
        deposit_balance_before: depositBefore,
        total_penalty_amount: totalPenalty,
        total_unbilled_service_amount: totalUnbilledService,
        amount_due_from_resident: amountDue,
        amount_refund_to_resident: amountRefund,
        finalized_at: new Date(),
        created_by: user.id
    }, { transaction });

    // ── Create SettlementItems ──
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

    // ── Mark unbilled requests as SETTLED ──
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
 * Get settlement by ID.
 */
const getSettlement = async (settlementId) => {
    const settlement = await Settlement.findByPk(settlementId, {
        include: [
            { model: SettlementItem, as: 'items' },
            { model: Contract, as: 'contract', attributes: ['id', 'contract_number', 'room_id'] },
            { model: User, as: 'resident', attributes: ['id', 'email', 'first_name', 'last_name'] },
            { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }
        ]
    });

    if (!settlement) {
        throw { status: 404, message: 'Settlement not found' };
    }

    return settlement;
};

/**
 * Get settlement by contract ID.
 */
const getSettlementByContract = async (contractId) => {
    const settlement = await Settlement.findOne({
        where: { contract_id: contractId },
        include: [
            { model: SettlementItem, as: 'items' },
            { model: Contract, as: 'contract', attributes: ['id', 'contract_number', 'room_id'] },
            { model: User, as: 'resident', attributes: ['id', 'email', 'first_name', 'last_name'] },
            { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }
        ]
    });

    if (!settlement) {
        throw { status: 404, message: 'Settlement not found for this contract' };
    }

    return settlement;
};

/**
 * Close a settlement after offline money exchange.
 */
const closeSettlement = async (settlementId, user) => {
    const settlement = await Settlement.findByPk(settlementId);

    if (!settlement) {
        throw { status: 404, message: 'Settlement not found' };
    }

    if (settlement.status !== SETTLEMENT_STATUS.FINALIZED) {
        throw { status: 400, message: `Cannot close settlement with status ${settlement.status}. Only FINALIZED settlements can be closed.` };
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

module.exports = { createCheckoutSettlement, getSettlement, getSettlementByContract, closeSettlement };
