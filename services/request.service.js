const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Request = require('../models/request.model');
const RequestImage = require('../models/requestImage.model');
const RequestStatusHistory = require('../models/requestStatusHistory.model');
const notificationService = require('./notification.service');
const Room = require('../models/room.model');
const User = require('../models/user.model');
const Asset = require('../models/asset.model');
const Building = require('../models/building.model');
const { ROLES } = require('../constants/roles');
const { createNotification } = require('./notification.service');

const REQUEST_STATUS_LABELS = {
    PENDING: 'Đang chờ xử lý',
    ASSIGNED: 'Đã phân công',
    PRICE_PROPOSED: 'Đã báo giá',
    APPROVED: 'Đã xác nhận',
    IN_PROGRESS: 'Đang xử lý',
    DONE: 'Đã hoàn thành',
    COMPLETED: 'Đã kết thúc',
    REVIEWED: 'Đã báo cáo lại',
    REFUNDED: 'Đã chấp nhận hoàn tiền',
    CANCELLED: 'Đã hủy',
};

const ACCESS_DENIED_MESSAGE = 'Bạn không có quyền thực hiện hành động này';

// Status transition rules.
// Each key is from_status with allowed target statuses and constraints.
const TRANSITION_MAP = {
    PENDING: {
        CANCELLED: {
            roles: [ROLES.RESIDENT],
            required: [],
        },
    },
    ASSIGNED: {
        PRICE_PROPOSED: {
            roles: [ROLES.STAFF],
            required: ['service_price'],
        },
    },
    PRICE_PROPOSED: {
        APPROVED: {
            roles: [ROLES.RESIDENT],
            required: [],
        },
        CANCELLED: {
            roles: [ROLES.RESIDENT],
            required: [],
        },
    },
    APPROVED: {
        IN_PROGRESS: {
            roles: [ROLES.STAFF],
            required: [],
        },
    },
    IN_PROGRESS: {
        DONE: {
            roles: [ROLES.STAFF],
            required: ['completion_note'],
        },
    },
    DONE: {
        COMPLETED: {
            roles: [ROLES.RESIDENT],
            required: ['feedback_rating'],
        },
        REVIEWED: {
            roles: [ROLES.RESIDENT],
            required: ['report_reason'],
        },
    },
    REVIEWED: {
        REFUNDED: {
            roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER],
            required: [],
        },
        COMPLETED: {
            roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER],
            required: [],
        },
    },
};

const validateTransition = (fromStatus, toStatus, callerRole, body) => {
    const fromMap = TRANSITION_MAP[fromStatus];
    if (!fromMap || !fromMap[toStatus]) {
        throw { status: 400, message: `Chuyển trạng thái không hợp lệ: ${fromStatus} → ${toStatus}` };
    }

    const rule = fromMap[toStatus];

    if (!rule.roles.includes(callerRole)) {
        throw { status: 403, message: `Vai trò ${callerRole} không được phép chuyển trạng thái từ ${fromStatus} sang ${toStatus}` };
    }

    for (const field of rule.required) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
            throw { status: 400, message: `Thiếu trường bắt buộc: ${field} (cho chuyển trạng thái ${fromStatus} → ${toStatus})` };
        }
    }
};

const getRequestAccessPayload = async (id) => {
    return Request.findByPk(id, {
        include: [
            {
                model: Room,
                as: 'room',
                attributes: ['id', 'room_number', 'floor', 'building_id'],
            },
        ],
    });
};

const assertRequestAccess = (request, actor) => {
    if (!request) {
        throw { status: 404, message: 'Không tìm thấy yêu cầu' };
    }

    if (actor.role === ROLES.ADMIN) {
        return;
    }

    if (actor.role === ROLES.BUILDING_MANAGER) {
        if (!actor.building_id || request.room?.building_id !== actor.building_id) {
            throw { status: 403, message: ACCESS_DENIED_MESSAGE };
        }
        return;
    }

    if (actor.role === ROLES.STAFF) {
        if (request.assigned_staff_id !== actor.id) {
            throw { status: 403, message: ACCESS_DENIED_MESSAGE };
        }
        return;
    }

    if (actor.role === ROLES.RESIDENT) {
        if (request.resident_id !== actor.id) {
            throw { status: 403, message: ACCESS_DENIED_MESSAGE };
        }
    }
};
// Generate request number (e.g., REQ-20260302-001).
const generateRequestNumber = async () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Count requests created today.
    const count = await Request.count({
        where: {
            request_number: { [Op.like]: `REQ-${dateStr}-%` }
        }
    });

    const nextId = String(count + 1).padStart(3, '0');
    return `REQ-${dateStr}-${nextId}`;
};

const getAllRequests = async (caller, { page = 1, limit = 10, status, request_type, room_id, assigned_staff_id, search } = {}) => {
    const offset = (page - 1) * limit;
    const where = {};
    const roomInclude = {
        model: Room,
        as: 'room',
        attributes: ['id', 'room_number', 'floor', 'building_id']
    };

    if (status) {
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
        where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
    }
    if (request_type) where.request_type = request_type;
    if (room_id) where.room_id = room_id;
    if (assigned_staff_id) where.assigned_staff_id = assigned_staff_id;

    // Search by title or request_number
    if (search) {
        where[Op.or] = [
            { title: { [Op.iLike]: `%${search}%` } },
            { request_number: { [Op.iLike]: `%${search}%` } },
            sequelize.where(sequelize.col('room.room_number'), { [Op.iLike]: `%${search}%` }),
            sequelize.where(sequelize.col('resident.first_name'), { [Op.iLike]: `%${search}%` }),
            sequelize.where(sequelize.col('resident.last_name'), { [Op.iLike]: `%${search}%` }),
            sequelize.where(
                sequelize.fn(
                    'concat',
                    sequelize.col('resident.last_name'),
                    ' ',
                    sequelize.col('resident.first_name')
                ),
                { [Op.iLike]: `%${search}%` }
            ),
        ];
    }

    if (caller.role === ROLES.BUILDING_MANAGER) {
        if (!caller.building_id) throw { status: 403, message: 'Quản lý tòa nhà chưa được phân công tòa nhà nào' };
        roomInclude.where = { building_id: caller.building_id };
        roomInclude.required = true;
    } else if (caller.role === ROLES.STAFF) {
        where.assigned_staff_id = caller.id;
    } else if (caller.role === ROLES.RESIDENT) {
        where.resident_id = caller.id;
    }
    // ADMIN sees all - no extra filter

    const { count, rows } = await Request.findAndCountAll({
        where,
        include: [
            roomInclude,
            { model: User, as: 'resident', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: User, as: 'staff', attributes: ['id', 'first_name', 'last_name'] }
        ],
        limit: Number(limit),
        offset: Number(offset),
        order: [['createdAt', 'DESC']]
    });

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows
    };
};

const getMyRequests = async (userId, { page = 1, limit = 10, status, request_type } = {}) => {
    const offset = (page - 1) * limit;
    const where = { resident_id: userId };
    if (status) {
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
        where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
    }
    if (request_type) where.request_type = request_type;

    const { count, rows } = await Request.findAndCountAll({
        where,
        include: [
            {
                model: Room, as: 'room',
                attributes: ['id', 'room_number', 'floor', 'building_id'],
                include: [{ model: Building, as: 'building', attributes: ['id', 'name'] }]
            },
            { model: User, as: 'staff', attributes: ['id', 'first_name', 'last_name'] },
            { model: RequestImage, as: 'images' }
        ],
        limit: Number(limit),
        offset: Number(offset),
        order: [['createdAt', 'DESC']]
    });

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows
    };
};

const getRequestById = async (caller, id) => {
    const request = await Request.findByPk(id, {
        include: [
            {
                model: Room, as: 'room',
                attributes: ['id', 'room_number', 'floor', 'building_id'],
                include: [{ model: Building, as: 'building', attributes: ['id', 'name'] }],
            },
            { model: User, as: 'resident', attributes: ['id', 'first_name', 'last_name', 'phone', 'email'] },
            { model: User, as: 'staff', attributes: ['id', 'first_name', 'last_name', 'phone'] },
            { model: Asset, as: 'asset', attributes: ['id', 'qr_code'] },
            { model: RequestImage, as: 'images' },
            {
                model: RequestStatusHistory,
                as: 'status_history',
                include: [{ model: User, as: 'modifier', attributes: ['id', 'first_name', 'last_name', 'role'] }],
            }
        ],
        order: [[{ model: RequestStatusHistory, as: 'status_history' }, 'created_at', 'DESC']]
    });

    if (!request) throw { status: 404, message: 'Không tìm thấy yêu cầu' };

    // Access check
    if (caller.role === ROLES.BUILDING_MANAGER) {
        if (request.room?.building_id !== caller.building_id) {
            throw { status: 403, message: 'Bạn không có quyền thực hiện hành động này' };
        }
    } else if (caller.role === ROLES.STAFF) {
        if (request.assigned_staff_id !== caller.id) {
            throw { status: 403, message: 'Bạn không có quyền thực hiện hành động này' };
        }
    } else if (caller.role === ROLES.RESIDENT) {
        if (request.resident_id !== caller.id) {
            throw { status: 403, message: 'Bạn không có quyền thực hiện hành động này' };
        }
    }

    return request;
};

const createRequest = async (data) => {
    const { imageUrls, ...requestData } = data;
    const transaction = await sequelize.transaction();

    try {
        const room = await Room.findByPk(requestData.room_id, { transaction });
        if (!room) throw { status: 404, message: 'Không tìm thấy phòng' };

        requestData.request_number = await generateRequestNumber();
        requestData.status = 'PENDING';

        const request = await Request.create(requestData, { transaction });

        if (imageUrls && imageUrls.length > 0) {
            const imageRecords = imageUrls.map(url => ({
                request_id: request.id,
                image_url: url,
                image_type: 'ATTACHMENT',
                uploaded_by: requestData.resident_id
            }));
            await RequestImage.bulkCreate(imageRecords, { transaction });
        }

        await RequestStatusHistory.create({
            request_id: request.id,
            from_status: null,
            to_status: 'PENDING',
            changed_by: requestData.resident_id,
            reason: 'Cư dân đã tạo yêu cầu'
        }, { transaction });

        await createNotification({
            type: "REQUEST_CREATED",
            title: "Yêu cầu dịch vụ mới",
            content: `Có yêu cầu ${request.request_number} vừa được tạo. Vui lòng kiểm tra và phân công cho nhân viên.`,
            target_type: "REQUEST",
            target_id: request.id,
            created_by: requestData.resident_id,
            building_id: room.building_id,
            roles: ["BUILDING_MANAGER"]
        }, transaction);

        // Notify resident that request was created successfully.
        await createNotification({
            type: "REQUEST_CREATED_SUCCESS",
            title: "Tạo yêu cầu thành công",
            content: `Yêu cầu ${request.request_number} của bạn đã được tạo thành công.`,
            target_type: "REQUEST",
            target_id: request.id,
            created_by: requestData.resident_id,
            specific_user_ids: [requestData.resident_id]
        }, transaction);

        await transaction.commit();

        return {
            id: request.id,
            request_number: request.request_number,
            room_id: request.room_id,
            request_type: request.request_type,
            title: request.title,
            status: request.status,
            created_at: request.created_at,
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const assignRequest = async (id, staff_id, actor) => {
    const request = await getRequestAccessPayload(id);
    assertRequestAccess(request, actor);

    if (request.status !== 'PENDING') {
        throw { status: 400, message: `Không thể phân công: trạng thái yêu cầu là ${request.status}, yêu cầu PENDING` };
    }

    const staff = await User.findByPk(staff_id, {
        attributes: ['id', 'role', 'building_id', 'is_active'],
    });

    if (!staff) {
        throw { status: 404, message: 'Không tìm thấy nhân viên được phân công' };
    }

    if (staff.role !== ROLES.STAFF) {
        throw { status: 400, message: 'Người dùng được chọn không phải nhân viên xử lý' };
    }

    if (!staff.is_active) {
        throw { status: 400, message: 'Nhân viên được chọn đã bị vô hiệu hóa' };
    }

    if (!request.room?.building_id || staff.building_id !== request.room.building_id) {
        throw { status: 400, message: 'Nhân viên được chọn không thuộc cùng tòa nhà với yêu cầu' };
    }

    const isCheckout = request.request_type === 'CHECKOUT';
    const finalStatus = isCheckout ? 'IN_PROGRESS' : 'ASSIGNED';

    const transaction = await sequelize.transaction();
    try {
        await request.update({
            assigned_staff_id: staff_id,
            status: finalStatus,
            ...(isCheckout && { request_price: 0 })
        }, { transaction });

        await RequestStatusHistory.create({
            request_id: request.id,
            from_status: 'PENDING',
            to_status: 'ASSIGNED',
            changed_by: actor.id,
            reason: 'Quản lý đã phân công yêu cầu cho nhân viên xử lý'
        }, { transaction });

        if (isCheckout) {
            for (const [from, to] of [['ASSIGNED', 'PRICE_PROPOSED'], ['PRICE_PROPOSED', 'APPROVED'], ['APPROVED', 'IN_PROGRESS']]) {
                await RequestStatusHistory.create({
                    request_id: request.id,
                    from_status: from,
                    to_status: to,
                    changed_by: actor.id,
                    reason: 'Tự động bỏ qua - yêu cầu checkout không có phí dịch vụ'
                }, { transaction });
            }
        }

        await transaction.commit();

        // Notify assigned staff.
        await notificationService.createNotification({
            type: 'REQUEST_ASSIGNED',
            title: 'Nhiệm vụ mới',
            content: `Bạn vừa được giao xử lý yêu cầu ${request.request_number}`,
            target_type: 'USER',
            target_id: staff_id,
            reference_type: 'REQUEST',
            reference_id: request.id,
            created_by: actor.id,
            specific_user_ids: [staff_id]
        });

        return getRequestById({ role: ROLES.ADMIN }, id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const updateRequestStatus = async (id, updateData, actor) => {
    const {
        status, changed_by, caller_role, reason,
        completionImages, service_price, completion_note,
        feedback_rating, feedback_comment, report_reason
    } = updateData;

    const request = await getRequestAccessPayload(id);
    assertRequestAccess(request, actor);

    const oldStatus = request.status;

    // Validate transition, role, and required fields.
    validateTransition(oldStatus, status, caller_role, updateData);

    const transaction = await sequelize.transaction();
    try {
        const requestUpdatePayload = { status };

        // PRICE_PROPOSED: staff submits a service quote.
        if (status === 'PRICE_PROPOSED') {
            requestUpdatePayload.request_price = service_price;
        }

        // DONE: staff marks work as completed.
        if (status === 'DONE') {
            requestUpdatePayload.completion_note = completion_note;
            requestUpdatePayload.completed_at = new Date();
        }

        // COMPLETED from DONE: Resident feedback OK
        if (status === 'COMPLETED' && oldStatus === 'DONE') {
            requestUpdatePayload.feedback_rating = feedback_rating;
            if (feedback_comment) requestUpdatePayload.feedback_comment = feedback_comment;
            requestUpdatePayload.feedback_at = new Date();
        }

        // REVIEWED: resident reports an issue after completion.
        if (status === 'REVIEWED') {
            requestUpdatePayload.report_reason = report_reason;
            requestUpdatePayload.reported_at = new Date();
        }

        if (status === 'REFUNDED') {
            requestUpdatePayload.refund_approved = true;
            requestUpdatePayload.refund_approved_by = changed_by;
            requestUpdatePayload.refund_approved_at = new Date();
        }

        await request.update(requestUpdatePayload, { transaction });

        // Store completion images for DONE status.
        if (completionImages && completionImages.length > 0) {
            const imageRecords = completionImages.map(url => ({
                request_id: id,
                image_url: url,
                image_type: 'COMPLETION',
                uploaded_by: changed_by
            }));
            await RequestImage.bulkCreate(imageRecords, { transaction });
        }

        await RequestStatusHistory.create({
            request_id: id,
            from_status: oldStatus,
            to_status: status,
            changed_by,
            reason: reason || `Cập nhật trạng thái thành ${REQUEST_STATUS_LABELS[status] || status}`
        }, { transaction });

        await transaction.commit();

        // Send status-change notification.
        const NOTIF_MAP = {
            PRICE_PROPOSED: {
                title: 'Có báo giá dịch vụ mới',
                content: `Nhân viên đã báo giá cho yêu cầu ${request.request_number}. Vui lòng kiểm tra và xác nhận.`,
            },
            APPROVED: {
                title: 'Yêu cầu đã được xác nhận',
                content: `Yêu cầu ${request.request_number} đã được xác nhận.`,
            },
            IN_PROGRESS: {
                title: 'Yêu cầu đang được xử lý',
                content: `Nhân viên đã bắt đầu xử lý yêu cầu ${request.request_number}.`,
            },
            DONE: {
                title: 'Yêu cầu đã hoàn thành',
                content: `Nhân viên đã hoàn thành yêu cầu ${request.request_number}. Vui lòng đánh giá dịch vụ.`,
            },
            COMPLETED: {
                title: 'Yêu cầu đã kết thúc',
                content: `Yêu cầu ${request.request_number} đã kết thúc.`,
            },
            REVIEWED: {
                title: 'Yêu cầu đã được báo cáo lại',
                content: `Yêu cầu ${request.request_number} đã được báo cáo lại để quản lý xem xét.`,
            },
            REFUNDED: {
                title: 'Yêu cầu được chấp nhận hoàn tiền',
                content: `Quản lý đã chấp nhận báo cáo cho yêu cầu ${request.request_number}. Hoàn tiền sẽ được xử lý.`,
            },
            CANCELLED: {
                title: 'Yêu cầu đã bị hủy',
                content: `Yêu cầu ${request.request_number} đã bị hủy.`,
            },
        };

        const notif = NOTIF_MAP[status] || {
            title: 'Cập nhật yêu cầu',
            content: `Yêu cầu ${request.request_number} đã chuyển sang trạng thái: ${REQUEST_STATUS_LABELS[status] || status}`,
        };

        await notificationService.createNotification({
            type: 'REQUEST_STATUS_CHANGED',
            title: notif.title,
            content: notif.content,
            target_type: 'USER',
            target_id: request.resident_id,
            reference_type: 'REQUEST',
            reference_id: request.id,
            created_by: changed_by
        });

        return getRequestById({ role: ROLES.ADMIN }, id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const getRequestStats = async (caller) => {
    const where = {};
    const include = [];

    if (caller.role === ROLES.BUILDING_MANAGER) {
        if (!caller.building_id) throw { status: 403, message: 'Building Manager chưa được gán tòa nhà.' };
        include.push({
            model: Room, as: 'room', attributes: [],
            where: { building_id: caller.building_id }, required: true,
        });
    }

    const rows = await Request.findAll({
        where,
        attributes: ['status', 'request_type'],
        include,
        raw: true,
    });

    const byStatus = {};
    const byType = {};

    for (const r of rows) {
        const sk = r.status.toLowerCase();
        byStatus[sk] = (byStatus[sk] || 0) + 1;
        const tk = r.request_type.toLowerCase();
        byType[tk] = (byType[tk] || 0) + 1;
    }

    return { total: rows.length, by_status: byStatus, by_type: byType };
};

module.exports = {
    getAllRequests,
    getMyRequests,
    getRequestById,
    createRequest,
    assignRequest,
    updateRequestStatus,
    getRequestStats,
    generateRequestNumber
};
