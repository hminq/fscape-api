const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Contract = require('../models/contract.model');
const ContractTemplate = require('../models/contractTemplate.model');
const User = require('../models/user.model');
const Room = require('../models/room.model');
const Building = require('../models/building.model');
const RoomType = require('../models/roomType.model');
const CustomerProfile = require('../models/customerProfile.model');
const Booking = require('../models/booking.model');
const { ROLES } = require('../constants/roles');
const {
    CONTRACT_LENGTH,
    isValidContractLength,
    isValidBookingBillingCycle
} = require('../constants/bookingEnums');
const { billingCycleToMonths } = require('../utils/billingCycle.util');
const { SIGNATURE_EXPIRY_MS } = require('../constants/contract');
const { generateSequentialId, generateNumberedId } = require('../utils/generateId');
const { INVOICE_TYPE } = require('../constants/invoiceEnums');
const { sendContractSigningEmail, sendManagerSigningEmail, sendContractActivatedEmail, sendInvoiceCreatedEmail, sendRenewalSigningEmail } = require('../utils/mail.util');
const { generateContractPdf } = require('../utils/pdf.util');
const auditService = require('./audit.service');
const { parseLocalDate } = require('../utils/date.util');

/* ── helpers ─────────────────────────────────────────────────── */

const TIMESTAMP_FIELDS = ['created_at', 'updated_at', 'createdAt', 'updatedAt'];

const stripTimestamps = (obj) => {
    if (!obj) return obj;
    const plain = typeof obj.toJSON === 'function' ? obj.toJSON() : { ...obj };
    TIMESTAMP_FIELDS.forEach(f => delete plain[f]);
    return plain;
};

const formatCurrency = (amount) => {
    return Number(amount).toLocaleString('vi-VN');
};

const formatDate = (date) => {
    if (!date) return '';
    const d = parseLocalDate(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const addMonths = (dateStr, months) => {
    const d = parseLocalDate(dateStr);
    d.setMonth(d.getMonth() + months);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

/**
 * Replace {{variable}} placeholders in HTML template with values.
 */
const renderTemplate = (htmlContent, fields) => {
    let rendered = htmlContent;
    for (const [key, value] of Object.entries(fields)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
    }
    return rendered;
};

/* ── queries ─────────────────────────────────────────────────── */

/**
 * Lấy danh sách hợp đồng.
 * - ADMIN: xem tất cả, bao gồm timestamps.
 * - BUILDING_MANAGER: chỉ xem hợp đồng trong tòa nhà mình, ẩn timestamps.
 */
const getAllContracts = async ({ page = 1, limit = 10, status, building_id, search } = {}, user) => {
    const offset = (page - 1) * limit;
    const where = {};
    const isAdmin = user.role === ROLES.ADMIN;

    if (status) {
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
        where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
    }
    if (search) {
        where[Op.or] = [
            { contract_number: { [Op.iLike]: `%${search}%` } }
        ];
    }

    // BM: force scope to their building
    if (!isAdmin && !user.building_id) {
        throw { status: 403, message: 'Building Manager chưa được gán tòa nhà.' };
    }
    const scopedBuildingId = isAdmin ? building_id : user.building_id;

    const include = [
        { model: User, as: 'customer', attributes: ['id', 'first_name', 'last_name', 'email'] },
        {
            model: Room,
            as: 'room',
            attributes: ['id', 'room_number'],
            ...(scopedBuildingId ? { required: true } : {}),
            include: [{
                model: Building,
                as: 'building',
                ...(scopedBuildingId ? { where: { id: scopedBuildingId }, required: true } : {})
            }]
        }
    ];

    const { count, rows } = await Contract.findAndCountAll({
        where,
        include,
        limit: Number(limit),
        offset: Number(offset),
        order: [['createdAt', 'DESC']]
    });

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: isAdmin ? rows : rows.map(stripTimestamps)
    };
};

/**
 * Chi tiết hợp đồng.
 * - ADMIN: đầy đủ.
 * - BUILDING_MANAGER: chỉ xem nếu thuộc building mình, ẩn timestamps.
 * - RESIDENT / CUSTOMER: chỉ xem hợp đồng của mình.
 */
const getContractById = async (id, user) => {
    const contract = await Contract.findByPk(id, {
        include: [
            { model: User, as: 'customer' },
            { model: User, as: 'manager' },
            {
                model: Room,
                as: 'room',
                include: [{ model: Building, as: 'building' }]
            },
            { model: ContractTemplate, as: 'template' }
        ]
    });
    if (!contract) throw { status: 404, message: 'Contract not found' };

    // BM scope check
    if (user.role === ROLES.BUILDING_MANAGER) {
        if (!user.building_id) {
            throw { status: 403, message: 'Building Manager chưa được gán tòa nhà.' };
        }
        const contractBuildingId = contract.room?.building?.id;
        if (!contractBuildingId || contractBuildingId !== user.building_id) {
            throw { status: 403, message: 'Bạn không có quyền truy cập hợp đồng này (khác tòa nhà).' };
        }
        return stripTimestamps(contract);
    }

    // RESIDENT / CUSTOMER: only own contracts
    if (user.role === ROLES.RESIDENT || user.role === ROLES.CUSTOMER) {
        if (contract.customer_id !== user.id) {
            throw { status: 403, message: 'You do not have access to this contract' };
        }
    }

    return contract;
};

/**
 * Cập nhật thông tin hợp đồng (gia hạn, dời end_date, ...)
 * - ADMIN: update bất kì hợp đồng nào.
 * - BUILDING_MANAGER: chỉ update hợp đồng trong tòa nhà mình.
 * - Chỉ cho phép khi contract chưa ACTIVE.
 */
const updateContract = async (id, data, user) => {
    const contract = await Contract.findByPk(id, {
        include: [{
            model: Room,
            as: 'room',
            include: [{ model: Building, as: 'building' }]
        }]
    });
    if (!contract) throw { status: 404, message: 'Contract not found' };

    // BM scope check
    if (user.role === ROLES.BUILDING_MANAGER) {
        const contractBuildingId = contract.room?.building?.id;
        if (!contractBuildingId || contractBuildingId !== user.building_id) {
            throw { status: 403, message: 'You do not have permission to edit this contract' };
        }
    }

    return await contract.update(data);
};

/**
 * Lấy danh sách hợp đồng của tôi (RESIDENT / CUSTOMER)
 */
const getMyContracts = async (userId) => {
    return await Contract.findAll({
        where: { customer_id: userId },
        attributes: [
            'id', 'contract_number', 'status', 'start_date', 'end_date',
            'base_rent', 'deposit_amount', 'pdf_url', 'rendered_content',
            'customer_signed_at', 'manager_signed_at', 'signature_expires_at',
            'createdAt'
        ],
        include: [{
            model: Room,
            as: 'room',
            attributes: ['id', 'room_number', 'floor', 'thumbnail_url'],
            include: [
                { model: Building, as: 'building', attributes: ['id', 'name', 'address'] },
                { model: RoomType, as: 'room_type', attributes: ['id', 'name'] }
            ]
        }],
        order: [['createdAt', 'DESC']]
    });
};

/* ── contract creation ────────────────────────────── */

/**
 * Tạo hợp đồng từ booking(sau khi depóosit thanhành coông).
 *
 *   1. Lấy default contract template
 *   2. Lấy thông tin customer, room, building, manager
 *   3. Build dynamic_fields + rendered_content
 *   4. INSERT contract với status = PENDING_CUSTOMER_SIGNATURE
 *   5. Cập nhật booking.contract_id
 *
 * @param {string} bookingId - UUID của booking đã DEPOSIT_PAID
 * @returns {Object} contract instance
 */
const createContractFromBooking = async (bookingId) => {
    const transaction = await sequelize.transaction();

    try {
        // 1. Lấy booking + room + room_type + building
        const { RoomType } = sequelize.models;
        const booking = await Booking.findByPk(bookingId, {
            include: [{
                model: Room,
                as: 'room',
                include: [
                    { model: RoomType, as: 'room_type' },
                    { model: Building, as: 'building' }
                ]
            }],
            transaction
        });

        if (!booking) throw { status: 404, message: 'Booking not found' };
        if (booking.status !== 'DEPOSIT_PAID') {
            throw { status: 400, message: 'Booking is not in DEPOSIT_PAID status' };
        }

        const room = booking.room;
        const building = room.building;
        const roomType = room.room_type;

        // 2. Lấy customer + profile
        const customer = await User.findByPk(booking.customer_id, {
            include: [{ model: CustomerProfile, as: 'profile' }],
            transaction
        });
        if (!customer) throw { status: 404, message: 'Customer not found' };

        // 3. Lấy building manager
        const manager = await User.findOne({
            where: { building_id: building.id, role: ROLES.BUILDING_MANAGER, is_active: true },
            transaction
        });
        if (!manager) throw { status: 400, message: 'No active Building Manager found for this building' };

        // 4. Lấy default contract template
        const template = await ContractTemplate.findOne({
            where: { is_default: true, is_active: true },
            transaction
        });
        if (!template) throw { status: 400, message: 'No active default contract template found' };

        // 5. Tính toán dates + term/billing
        const durationMonths = Number(booking.duration_months);
        const resolvedDurationMonths = isValidContractLength(durationMonths)
            ? durationMonths
            : CONTRACT_LENGTH.SIX_MONTHS;
        const startDate = booking.check_in_date;
        const endDate = addMonths(startDate, resolvedDurationMonths);
        const termType = 'FIXED_TERM';
        // Trust billing cycle already validated at booking time.
        const billingCycle = booking.billing_cycle;

        // 6. Generate contract number
        const currentCount = await Contract.count({ transaction });
        const contractNumber = generateSequentialId('CON', currentCount);

        // 7. Build dynamic_fields
        const profile = customer.profile;
        const dynamicFields = {
            contract_number: contractNumber,
            start_date: formatDate(startDate),
            end_date: endDate ? formatDate(endDate) : 'Không xác định',
            building_address: building.address || '',
            building_name: building.name,
            manager_name: `${manager.last_name || ''} ${manager.first_name || ''}`.trim(),
            customer_name: `${customer.last_name || ''} ${customer.first_name || ''}`.trim(),
            customer_date_of_birth: formatDate(profile?.date_of_birth),
            customer_gender: profile?.gender || '',
            customer_phone: customer.phone || '',
            customer_email: customer.email || '',
            customer_permanent_address: profile?.permanent_address || '',
            customer_emergency_contact_name: profile?.emergency_contact_name || '',
            customer_emergency_contact_phone: profile?.emergency_contact_phone || '',
            room_number: room.room_number,
            room_type: roomType?.name || '',
            term_type: 'Có thời hạn',
            base_rent: formatCurrency(roomType?.base_price || 0),
            deposit_amount: formatCurrency(booking.deposit_amount)
            // NOTE: Do NOT include manager_signature / customer_signature here.
            // The {{customer_signature}} and {{manager_signature}} placeholders
            // must remain in rendered_content so customerSign / managerSign can
            // replace them with <img> tags when the parties actually sign.
        };

        // 8. Render HTML from template
        const renderedContent = renderTemplate(template.content, dynamicFields);

        // 9. Create contract
        const contract = await Contract.create({
            contract_number: contractNumber,
            template_id: template.id,
            room_id: room.id,
            customer_id: customer.id,
            manager_id: manager.id,
            term_type: termType,
            start_date: startDate,
            end_date: endDate,
            duration_months: resolvedDurationMonths,
            base_rent: roomType?.base_price || 0,
            deposit_amount: booking.deposit_amount,
            deposit_original_amount: booking.deposit_amount,
            deposit_balance: booking.deposit_amount,
            billing_cycle: billingCycle,
            dynamic_fields: dynamicFields,
            rendered_content: renderedContent,
            status: 'PENDING_CUSTOMER_SIGNATURE',
            signature_expires_at: new Date(Date.now() + SIGNATURE_EXPIRY_MS)
        }, { transaction });

        // 10. Link booking to contract
        await booking.update({ contract_id: contract.id }, { transaction });

        await transaction.commit();

        // Send signing email with direct link
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const signingUrl = `${clientUrl}/sign?contractId=${contract.id}`;

        await sendContractSigningEmail(customer.email, {
            customerName: dynamicFields.customer_name,
            contractNumber,
            roomNumber: room.room_number,
            buildingName: building.name,
            signingUrl
        }).catch(err => console.error('[ContractService] Failed to send signing email:', err));

        return contract;

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/* ── contract renewal ─────────────────────────────────────────── */

/**
 * Gia hạn hợp đồng (RESIDENT only).
 *
 *   1. Validate user owns the contract and is RESIDENT
 *   2. Validate contract status (ACTIVE or EXPIRING_SOON)
 *   3. Validate no pending renewal exists
 *   4. Validate duration_months and billing_cycle
 *   5. Create new contract linked via renewed_from_contract_id
 *   6. Create ContractExtension audit record
 *   7. Send renewal signing email
 *
 * @param {string} contractId - UUID of the contract to renew
 * @param {Object} body - { duration_months, billing_cycle?, notes? }
 * @param {Object} user - Authenticated user (req.user)
 * @returns {Object} new contract instance
 */
const renewContract = async (contractId, body, user) => {
    const transaction = await sequelize.transaction();

    try {
        // 1. Fetch old contract with associations
        const oldContract = await Contract.findByPk(contractId, {
            include: [{
                model: Room,
                as: 'room',
                include: [
                    { model: RoomType, as: 'room_type' },
                    { model: Building, as: 'building' }
                ]
            }],
            transaction
        });
        if (!oldContract) throw { status: 404, message: 'Contract not found' };

        // 2. Only RESIDENT who owns the contract can renew
        if (user.role !== ROLES.RESIDENT) {
            throw { status: 403, message: 'Chỉ cư dân (RESIDENT) mới có thể gia hạn hợp đồng' };
        }
        if (oldContract.customer_id !== user.id) {
            throw { status: 403, message: 'Bạn không có quyền gia hạn hợp đồng này' };
        }

        // 3. Only ACTIVE or EXPIRING_SOON contracts can be renewed
        if (!['ACTIVE', 'EXPIRING_SOON'].includes(oldContract.status)) {
            throw { status: 400, message: 'Chỉ có thể gia hạn hợp đồng đang ACTIVE hoặc EXPIRING_SOON' };
        }

        // 4. Prevent duplicate pending renewals (only block if one is actively being signed)
        const existingRenewal = await Contract.findOne({
            where: {
                renewed_from_contract_id: contractId,
                status: { [Op.in]: ['PENDING_CUSTOMER_SIGNATURE', 'PENDING_MANAGER_SIGNATURE'] }
            },
            transaction
        });
        if (existingRenewal) {
            throw { status: 400, message: 'Hợp đồng này đã có yêu cầu gia hạn đang chờ xử lý' };
        }

        // 5. Validate duration_months
        const { duration_months, billing_cycle, notes } = body;
        if (!duration_months || !isValidContractLength(duration_months)) {
            throw { status: 400, message: 'duration_months phải là 6 hoặc 12' };
        }

        // 6. Validate billing_cycle if provided
        const resolvedBillingCycle = billing_cycle || oldContract.billing_cycle;
        if (billing_cycle && !isValidBookingBillingCycle(billing_cycle)) {
            throw { status: 400, message: 'billing_cycle không hợp lệ (CYCLE_1M, CYCLE_3M, CYCLE_6M, ALL_IN)' };
        }

        const room = oldContract.room;
        const building = room.building;
        const roomType = room.room_type;

        // 7. Fetch customer + profile
        const customer = await User.findByPk(oldContract.customer_id, {
            include: [{ model: CustomerProfile, as: 'profile' }],
            transaction
        });
        if (!customer) throw { status: 404, message: 'Customer not found' };

        // 8. Fetch building manager
        const manager = await User.findOne({
            where: { building_id: building.id, role: ROLES.BUILDING_MANAGER, is_active: true },
            transaction
        });
        if (!manager) throw { status: 400, message: 'No active Building Manager found for this building' };

        // 9. Fetch default contract template
        const template = await ContractTemplate.findOne({
            where: { is_default: true, is_active: true },
            transaction
        });
        if (!template) throw { status: 400, message: 'No active default contract template found' };

        // 10. Calculate dates
        const durationMonths = Number(duration_months);
        const startDate = oldContract.end_date; // seamless transition
        const endDate = addMonths(startDate, durationMonths);

        // 11. Generate contract number
        const currentCount = await Contract.count({ transaction });
        const contractNumber = generateSequentialId('CON', currentCount);

        // 12. Build dynamic_fields (same pattern as createContractFromBooking)
        const profile = customer.profile;
        const dynamicFields = {
            contract_number: contractNumber,
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            building_address: building.address || '',
            building_name: building.name,
            manager_name: `${manager.last_name || ''} ${manager.first_name || ''}`.trim(),
            customer_name: `${customer.last_name || ''} ${customer.first_name || ''}`.trim(),
            customer_date_of_birth: formatDate(profile?.date_of_birth),
            customer_gender: profile?.gender || '',
            customer_phone: customer.phone || '',
            customer_email: customer.email || '',
            customer_permanent_address: profile?.permanent_address || '',
            customer_emergency_contact_name: profile?.emergency_contact_name || '',
            customer_emergency_contact_phone: profile?.emergency_contact_phone || '',
            room_number: room.room_number,
            room_type: roomType?.name || '',
            term_type: 'Có thời hạn',
            base_rent: formatCurrency(roomType?.base_price || 0),
            deposit_amount: formatCurrency(oldContract.deposit_original_amount)
        };

        // 13. Render HTML from template
        const renderedContent = renderTemplate(template.content, dynamicFields);

        // 14. Create new contract
        const newContract = await Contract.create({
            contract_number: contractNumber,
            template_id: template.id,
            room_id: room.id,
            customer_id: customer.id,
            manager_id: manager.id,
            term_type: 'FIXED_TERM',
            start_date: startDate,
            end_date: endDate,
            duration_months: durationMonths,
            base_rent: roomType?.base_price || 0,
            deposit_amount: oldContract.deposit_original_amount,
            deposit_original_amount: oldContract.deposit_original_amount,
            deposit_balance: oldContract.deposit_original_amount,
            billing_cycle: resolvedBillingCycle,
            dynamic_fields: dynamicFields,
            rendered_content: renderedContent,
            status: 'PENDING_CUSTOMER_SIGNATURE',
            signature_expires_at: new Date(Date.now() + SIGNATURE_EXPIRY_MS),
            renewed_from_contract_id: oldContract.id,
            notes: notes || null
        }, { transaction });

        // 15. Create ContractExtension record (audit trail)
        const { ContractExtension } = sequelize.models;
        await ContractExtension.create({
            contract_id: newContract.id,
            previous_end_date: oldContract.end_date,
            new_end_date: endDate,
            extension_months: durationMonths,
            reason: notes || 'Gia hạn hợp đồng theo yêu cầu cư dân'
        }, { transaction });

        await transaction.commit();

        // 16. Send renewal signing email
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const signingUrl = `${clientUrl}/sign?contractId=${newContract.id}`;

        await sendRenewalSigningEmail(customer.email, {
            customerName: dynamicFields.customer_name,
            contractNumber,
            oldContractNumber: oldContract.contract_number,
            roomNumber: room.room_number,
            buildingName: building.name,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            signingUrl
        }).catch(err => console.error('[ContractService] Failed to send renewal signing email:', err));

        return newContract;

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/* ── contract signing ────────────────────────────────────────── */

/**
 * Customer / Resident ký hợp đồng.
 *
 *   1. Verify status = PENDING_CUSTOMER_SIGNATURE
 *   2. Verify user owns the contract
 *   3. Set customer_signature_url + customer_signed_at
 *   4. Update rendered_content with signature image
 *   5. Status → PENDING_MANAGER_SIGNATURE
 *   6. Audit log
 */
const customerSign = async (contractId, signatureUrl, user, req) => {
    const contract = await Contract.findByPk(contractId, {
        include: [{
            model: Room,
            as: 'room',
            include: [{ model: Building, as: 'building' }]
        }]
    });
    if (!contract) throw { status: 404, message: 'Contract not found' };

    if (contract.status !== 'PENDING_CUSTOMER_SIGNATURE') {
        throw { status: 400, message: 'Contract is not awaiting customer signature' };
    }

    if (contract.signature_expires_at && new Date() > new Date(contract.signature_expires_at)) {
        throw { status: 400, message: 'Signing deadline has expired' };
    }

    if (contract.customer_id !== user.id) {
        throw { status: 403, message: 'You do not have permission to sign this contract' };
    }

    const oldStatus = contract.status;

    // Update rendered_content: replace customer_signature placeholder with <img>
    const signatureImg = `<img src="${signatureUrl}" alt="Customer Signature" style="width:200px;height:80px;object-fit:contain" />`;
    let updatedContent = contract.rendered_content || '';
    updatedContent = updatedContent.replace('{{customer_signature}}', signatureImg);

    await contract.update({
        customer_signature_url: signatureUrl,
        customer_signed_at: new Date(),
        rendered_content: updatedContent,
        status: 'PENDING_MANAGER_SIGNATURE',
        signature_expires_at: new Date(Date.now() + SIGNATURE_EXPIRY_MS)
    });

    // Audit log
    await auditService.log({
        user,
        action: 'SIGN',
        entityType: 'contract',
        entityId: contract.id,
        oldValue: { status: oldStatus },
        newValue: { status: 'PENDING_MANAGER_SIGNATURE', customer_signature_url: signatureUrl },
        req
    });

    // Send email to Building Manager to sign
    const manager = await User.findByPk(contract.manager_id);
    const customer = await User.findByPk(contract.customer_id);
    if (manager && customer) {
        const adminUrl = process.env.ADMIN_URL || 'http://localhost:5174';
        const signingUrl = `${adminUrl}/building-manager/contracts?sign=${contract.id}`;
        const customerName = `${customer.last_name || ''} ${customer.first_name || ''}`.trim();
        const managerName = `${manager.last_name || ''} ${manager.first_name || ''}`.trim();

        await sendManagerSigningEmail(manager.email, {
            managerName,
            customerName,
            contractNumber: contract.contract_number,
            roomNumber: contract.room?.room_number || '',
            buildingName: contract.room?.building?.name || '',
            signingUrl
        }).catch(err => console.error('[ContractService] Failed to send manager signing email:', err));
    }

    return contract;
};

/**
 * Building Manager ký hợp đồng (bước cuối → ACTIVE).
 *
 *   1. Verify status = PENDING_MANAGER_SIGNATURE
 *   2. Verify BM manages the building
 *   3. Set manager_signature_url + manager_signed_at
 *   4. Update rendered_content with signature image
 *   5. Status → ACTIVE
 *   6. Room → OCCUPIED
 *   7. User role: CUSTOMER → RESIDENT
 *   8. Booking → CONVERTED
 *   9. Set next_billing_date
 *   10. Audit log
 */
const managerSign = async (contractId, signatureUrl, user, req) => {
    const transaction = await sequelize.transaction();

    try {
        const contract = await Contract.findByPk(contractId, {
            include: [{
                model: Room,
                as: 'room',
                include: [{ model: Building, as: 'building' }]
            }],
            transaction
        });
        if (!contract) throw { status: 404, message: 'Contract not found' };

        if (contract.status !== 'PENDING_MANAGER_SIGNATURE') {
            throw { status: 400, message: 'Contract is not awaiting manager signature' };
        }

        if (contract.signature_expires_at && new Date() > new Date(contract.signature_expires_at)) {
            throw { status: 400, message: 'Signing deadline has expired' };
        }

        // BM scope check
        const contractBuildingId = contract.room?.building?.id;
        if (!contractBuildingId || contractBuildingId !== user.building_id) {
            throw { status: 403, message: 'You do not have permission to sign this contract' };
        }

        const oldStatus = contract.status;

        // Update rendered_content: replace manager_signature placeholder with <img>
        const signatureImg = `<img src="${signatureUrl}" alt="Manager Signature" style="width:200px;height:80px;object-fit:contain" />`;
        let updatedContent = contract.rendered_content || '';
        updatedContent = updatedContent.replace('{{manager_signature}}', signatureImg);

        // Keep backward compatibility for legacy billing values, and support ALL_IN.
        const billingMonths = billingCycleToMonths(contract.billing_cycle);
        const nextBillingDate = billingMonths == null
            ? null
            : addMonths(contract.start_date, billingMonths);

        // Compute new billing timestamp fields
        const nextRentBillingAt = billingMonths == null
            ? null
            : parseLocalDate(addMonths(contract.start_date, billingMonths));
        const startLocal = parseLocalDate(contract.start_date);
        const nextServiceBillingAt = new Date(
            startLocal.getTime() + 30 * 24 * 60 * 60 * 1000
        );

        // 1. Update contract → ACTIVE
        await contract.update({
            manager_signature_url: signatureUrl,
            manager_signed_at: new Date(),
            rendered_content: updatedContent,
            status: 'ACTIVE',
            next_billing_date: nextBillingDate,
            next_rent_billing_at: nextRentBillingAt,
            next_service_billing_at: nextServiceBillingAt,
            signature_expires_at: null
        }, { transaction });

        // 2–4. Handle room, user role, and booking based on renewal vs new contract
        if (contract.renewed_from_contract_id) {
            // RENEWAL: finish the old contract, room is already OCCUPIED
            const oldContract = await Contract.findByPk(contract.renewed_from_contract_id, { transaction });
            if (oldContract && ['ACTIVE', 'EXPIRING_SOON', 'FINISHED'].includes(oldContract.status)) {
                await oldContract.update({ status: 'FINISHED' }, { transaction });
            }
            // Room stays OCCUPIED — no change needed
            // No booking to CONVERT — renewals don't create bookings

            // Safety net: restore RESIDENT role if cron downgraded it
            // (edge case: old contract expired before renewal was signed)
            const customer = await User.findByPk(contract.customer_id, { transaction });
            if (customer && customer.role === ROLES.CUSTOMER) {
                await customer.update({
                    role: ROLES.RESIDENT,
                    building_id: contractBuildingId
                }, { transaction });
            }
        } else {
            // ORIGINAL FLOW: new contract from booking
            // 2. Room → OCCUPIED
            const room = await Room.findByPk(contract.room_id, { transaction });
            if (room) {
                await room.update({ status: 'OCCUPIED' }, { transaction });
            }

            // 3. Customer → RESIDENT (if currently CUSTOMER)
            const customer = await User.findByPk(contract.customer_id, { transaction });
            if (customer && customer.role === ROLES.CUSTOMER) {
                await customer.update({
                    role: ROLES.RESIDENT,
                    building_id: contractBuildingId
                }, { transaction });
            }

            // 4. Booking → CONVERTED
            const booking = await Booking.findOne({
                where: { contract_id: contract.id },
                transaction
            });
            if (booking) {
                await booking.update({
                    status: 'CONVERTED',
                    converted_at: new Date()
                }, { transaction });
            }
        }

        // 5. Create first RENT invoice
        const { Invoice, InvoiceItem } = sequelize.models;

        const billingPeriodStart = contract.start_date; // YYYY-MM-DD string
        let billingPeriodEnd;
        let rentMonths;

        if (billingMonths == null) {
            // ALL_IN: single invoice covering the entire contract
            billingPeriodEnd = contract.end_date;
            rentMonths = Number(contract.duration_months);
        } else {
            // Subtract 1 day from end: e.g. Jan 1 + 3 months = Apr 1, end = Mar 31
            const endDate = new Date(addMonths(billingPeriodStart, billingMonths));
            endDate.setDate(endDate.getDate() - 1);
            billingPeriodEnd = endDate.toISOString().split('T')[0];
            rentMonths = billingMonths;
        }

        const roomRent = Number(contract.base_rent) * rentMonths;

        const firstInvoice = await Invoice.create({
            invoice_number: generateNumberedId('INV'),
            contract_id: contract.id,
            invoice_type: INVOICE_TYPE.RENT,
            billing_period_start: billingPeriodStart,
            billing_period_end: billingPeriodEnd,
            room_rent: roomRent,
            request_fees: 0,
            penalty_fees: 0,
            total_amount: roomRent,
            status: 'UNPAID',
            due_date: contract.start_date
        }, { transaction });

        await InvoiceItem.create({
            invoice_id: firstInvoice.id,
            item_type: 'RENT',
            description: `Tiền thuê phòng từ ${billingPeriodStart} đến ${billingPeriodEnd}`,
            quantity: 1,
            unit_price: roomRent,
            amount: roomRent
        }, { transaction });

        // 6. Audit log
        await auditService.log({
            user,
            action: 'SIGN',
            entityType: 'contract',
            entityId: contract.id,
            oldValue: { status: oldStatus },
            newValue: { status: 'ACTIVE', manager_signature_url: signatureUrl },
            req
        }, { transaction });

        await transaction.commit();

        // Generate final PDF and upload to Cloudinary (async, non-blocking)
        generateContractPdf(contract.rendered_content, contract.contract_number)
            .then(async (pdfUrl) => {
                await Contract.update({ pdf_url: pdfUrl }, { where: { id: contract.id } });
                console.log(`[ContractService] PDF generated: ${pdfUrl}`);
            })
            .catch(err => console.error('[ContractService] Failed to generate PDF:', err));

        // Send activation confirmation email to resident
        const customerForEmail = await User.findByPk(contract.customer_id);
        if (customerForEmail) {
            const customerName = `${customerForEmail.last_name || ''} ${customerForEmail.first_name || ''}`.trim();
            await sendContractActivatedEmail(customerForEmail.email, {
                customerName,
                contractNumber: contract.contract_number,
                roomNumber: contract.room?.room_number || '',
                buildingName: contract.room?.building?.name || '',
                startDate: formatDate(contract.start_date)
            }).catch(err => console.error('[ContractService] Failed to send activation email:', err));

            // Send first invoice notification email
            const formatAmount = (v) => new Intl.NumberFormat('vi-VN').format(Number(v)) + 'đ';
            await sendInvoiceCreatedEmail(customerForEmail.email, {
                customerName,
                invoiceNumber: firstInvoice.invoice_number,
                invoiceId: firstInvoice.id,
                roomNumber: contract.room?.room_number || '',
                buildingName: contract.room?.building?.name || '',
                billingPeriod: `${formatDate(billingPeriodStart)} – ${formatDate(billingPeriodEnd)}`,
                totalAmount: formatAmount(roomRent),
                dueDate: formatDate(contract.start_date)
            }).catch(err => console.error('[ContractService] Failed to send invoice email:', err));
        }

        return contract;

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const getContractStats = async () => {
    const contracts = await Contract.findAll({
        attributes: ['status', 'room_id'],
        include: [{
            model: Room, as: 'room', attributes: ['id'],
            include: [{ model: Building, as: 'building', attributes: ['id', 'name'] }]
        }],
        raw: true, nest: true,
    });

    const byStatus = {
        pending_customer_signature: 0, pending_manager_signature: 0,
        active: 0, expiring_soon: 0, finished: 0, terminated: 0,
    };
    const byBuilding = {};

    for (const c of contracts) {
        const key = c.status.toLowerCase();
        if (byStatus[key] !== undefined) byStatus[key]++;
        const bId = c.room?.building?.id;
        const bName = c.room?.building?.name || 'Khác';
        if (bId) {
            if (!byBuilding[bId]) byBuilding[bId] = { building_id: bId, name: bName, count: 0 };
            byBuilding[bId].count++;
        }
    }

    return { total: contracts.length, by_status: byStatus, by_building: Object.values(byBuilding).sort((a, b) => b.count - a.count) };
};

module.exports = {
    getAllContracts,
    getContractById,
    getMyContracts,
    createContractFromBooking,
    renewContract,
    customerSign,
    managerSign,
    updateContract,
    getContractStats
};
