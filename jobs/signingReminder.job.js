const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { SIGNATURE_EXPIRY_MS } = require('../constants/contract');
const {
    sendSigningReminderEmail,
    sendSigningUrgentReminderEmail
} = require('../utils/mail.util');

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_HOUR_MS = 1 * 60 * 60 * 1000;

const run = async () => {
    const { Contract, User, Room, Building } = sequelize.models;

    const pendingContracts = await Contract.findAll({
        where: {
            status: { [Op.in]: ['PENDING_CUSTOMER_SIGNATURE', 'PENDING_MANAGER_SIGNATURE'] },
            signature_expires_at: { [Op.not]: null, [Op.gt]: new Date() }
        },
        include: [
            { model: User, as: 'customer', attributes: ['id', 'email', 'first_name', 'last_name'] },
            { model: User, as: 'manager', attributes: ['id', 'email', 'first_name', 'last_name'] },
            {
                model: Room, as: 'room', attributes: ['id', 'room_number'],
                include: [{ model: Building, as: 'building', attributes: ['id', 'name'] }]
            }
        ]
    });

    for (const contract of pendingContracts) {
        try {
            const expiresAt = new Date(contract.signature_expires_at).getTime();
            const createdAt = expiresAt - SIGNATURE_EXPIRY_MS;
            const now = Date.now();
            const elapsed = now - createdAt;
            const remaining = expiresAt - now;

            // Determine recipient based on current signing stage
            let recipientEmail, recipientName, signingUrl;
            if (contract.status === 'PENDING_CUSTOMER_SIGNATURE' && contract.customer) {
                recipientEmail = contract.customer.email;
                recipientName = `${contract.customer.last_name} ${contract.customer.first_name}`.trim();
                signingUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/sign?contractId=${contract.id}`;
            } else if (contract.status === 'PENDING_MANAGER_SIGNATURE' && contract.manager) {
                recipientEmail = contract.manager.email;
                recipientName = `${contract.manager.last_name} ${contract.manager.first_name}`.trim();
                signingUrl = `${process.env.ADMIN_URL || 'http://localhost:5174'}/building-manager/contracts?sign=${contract.id}`;
            }

            if (!recipientEmail) continue;

            const roomNumber = contract.room?.room_number || '';
            const buildingName = contract.room?.building?.name || '';
            const emailData = {
                customerName: recipientName,
                contractNumber: contract.contract_number,
                contractId: contract.id,
                roomNumber,
                buildingName,
                signingUrl
            };

            // 6h+ elapsed → send reminder
            if (elapsed >= SIX_HOURS_MS) {
                const hoursRemaining = Math.floor(remaining / (60 * 60 * 1000));
                await sendSigningReminderEmail(recipientEmail, { ...emailData, hoursRemaining });
            }

            // ≤1h remaining → send urgent
            if (remaining <= ONE_HOUR_MS) {
                await sendSigningUrgentReminderEmail(recipientEmail, emailData);
            }
        } catch (err) {
            console.error(`[SigningReminderJob] Failed for contract ${contract.id}:`, err.message);
        }
    }
};

module.exports = { run };
