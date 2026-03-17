const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { createNotification } = require('../services/notification.service');
const { parseLocalDate } = require('../utils/date.util');
const { sendContractExpiringSoonEmail } = require('../utils/mail.util');

const EXPIRY_THRESHOLD_DAYS = 30;

const run = async () => {
    const { Contract, Room, User, ScheduledJob } = sequelize.models;

    const job = await ScheduledJob.create({
        job_name: 'contract_expiry_lifecycle',
        job_type: 'CRON',
        status: 'RUNNING',
        started_at: new Date()
    });

    try {
        const now = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(now.getDate() + EXPIRY_THRESHOLD_DAYS);

        let processed = 0;

        // ── Phase 1: EXPIRING_SOON → FINISHED (end_date đã qua) ──
        const expiredContracts = await Contract.findAll({
            where: {
                status: 'EXPIRING_SOON',
                end_date: { [Op.lt]: now }
            },
            include: [
                { model: Room, as: 'room', attributes: ['id', 'room_number', 'building_id'] }
            ]
        });

        for (const contract of expiredContracts) {
            const transaction = await sequelize.transaction();
            try {
                await contract.update({ status: 'FINISHED' }, { transaction });

                // Note: RESIDENT → CUSTOMER demotion is NOT done here.
                // Demotion happens in the staff checkout flow (inspection.service.js → confirmCheckOut)
                // because the resident still needs app access for checkout request, asset inspection, and final settlement.

                await transaction.commit();
                processed++;

                // Notification (outside transaction)
                try {
                    const recipientIds = [contract.customer_id];
                    if (contract.room?.building_id) {
                        const bms = await User.findAll({
                            where: {
                                building_id: contract.room.building_id,
                                role: 'BUILDING_MANAGER',
                                is_active: true
                            },
                            attributes: ['id']
                        });
                        recipientIds.push(...bms.map(bm => bm.id));
                    }

                    await createNotification({
                        type: 'CONTRACT_FINISHED',
                        title: 'Hợp đồng đã kết thúc',
                        content: `Hợp đồng ${contract.contract_number} phòng ${contract.room?.room_number || ''} đã hết hạn. Vui lòng tạo yêu cầu checkout để staff kiểm tra tài sản và hoàn tất thủ tục trả phòng.`,
                        target_type: 'CONTRACT',
                        target_id: contract.id,
                        specific_user_ids: recipientIds
                    });
                } catch (notifErr) {
                    console.error(`[ContractExpiryJob] Notification failed for ${contract.contract_number}:`, notifErr.message);
                }

                console.log(`[ContractExpiryJob] ${contract.contract_number} → FINISHED`);
            } catch (err) {
                await transaction.rollback();
                console.error(`[ContractExpiryJob] Failed FINISHED for ${contract.id}:`, err.message);
            }
        }

        // ── Phase 2: ACTIVE → EXPIRING_SOON (end_date ≤ 30 ngày) ──
        const soonContracts = await Contract.findAll({
            where: {
                status: 'ACTIVE',
                end_date: { [Op.lte]: thresholdDate }
            },
            include: [
                { model: User, as: 'customer', attributes: ['id', 'email', 'first_name', 'last_name'] },
                {
                    model: Room, as: 'room', attributes: ['id', 'room_number', 'building_id'],
                    include: [{ model: sequelize.models.Building, as: 'building', attributes: ['id', 'name'] }]
                }
            ]
        });

        for (const contract of soonContracts) {
            const transaction = await sequelize.transaction();
            try {
                await contract.update({ status: 'EXPIRING_SOON' }, { transaction });

                await transaction.commit();
                processed++;

                // Notification (outside transaction)
                const endDate = parseLocalDate(contract.end_date).toLocaleDateString('vi-VN');
                try {
                    const recipientIds = [contract.customer_id];
                    if (contract.room?.building_id) {
                        const bms = await User.findAll({
                            where: {
                                building_id: contract.room.building_id,
                                role: 'BUILDING_MANAGER',
                                is_active: true
                            },
                            attributes: ['id']
                        });
                        recipientIds.push(...bms.map(bm => bm.id));
                    }

                    await createNotification({
                        type: 'CONTRACT_EXPIRING_SOON',
                        title: 'Hợp đồng sắp hết hạn',
                        content: `Hợp đồng ${contract.contract_number} phòng ${contract.room?.room_number || ''} sẽ hết hạn vào ${endDate}`,
                        target_type: 'CONTRACT',
                        target_id: contract.id,
                        specific_user_ids: recipientIds
                    });
                } catch (notifErr) {
                    console.error(`[ContractExpiryJob] Notification failed for ${contract.contract_number}:`, notifErr.message);
                }

                // Send email to resident
                try {
                    if (contract.customer?.email) {
                        const customerName = `${contract.customer.last_name || ''} ${contract.customer.first_name || ''}`.trim();
                        await sendContractExpiringSoonEmail(contract.customer.email, {
                            customerName,
                            contractNumber: contract.contract_number,
                            contractId: contract.id,
                            roomNumber: contract.room?.room_number || '',
                            buildingName: contract.room?.building?.name || '',
                            endDate
                        });
                    }
                } catch (emailErr) {
                    console.error(`[ContractExpiryJob] Email failed for ${contract.contract_number}:`, emailErr.message);
                }

                console.log(`[ContractExpiryJob] ${contract.contract_number} → EXPIRING_SOON`);
            } catch (err) {
                await transaction.rollback();
                console.error(`[ContractExpiryJob] Failed EXPIRING_SOON for ${contract.id}:`, err.message);
            }
        }

        await job.update({
            status: 'COMPLETED',
            completed_at: new Date(),
            records_processed: processed
        });

        if (processed > 0) {
            console.log(`[ContractExpiryJob] Completed: ${processed} contract(s) updated`);
        }
    } catch (err) {
        await job.update({
            status: 'FAILED',
            completed_at: new Date(),
            error_message: err.message
        });
        console.error('[ContractExpiryJob] Job failed:', err.message);
    }
};

module.exports = { run };
