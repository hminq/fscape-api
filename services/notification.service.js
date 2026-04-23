const { sequelize } = require("../config/db");
const Notification = require("../models/notification.model");
const NotificationRecipient = require("../models/notificationRecipient.model");
const User = require("../models/user.model");
const Contract = require("../models/contract.model");
const Room = require("../models/room.model");

/**
 * Create a notification and dispatch it to recipients.
 */
const createNotification = async (payload) => {
  const {
    type,
    title,
    content,
    target_type,
    target_id,
    reference_type,
    reference_id,
    created_by,

    specific_user_ids = [],
    broadcast_all = false,
    building_id = null,
    roles = [],
  } = payload;

  const transaction = await sequelize.transaction();

  try {
    const notification = await Notification.create(
      {
        type,
        title,
        content,
        target_type,
        target_id,
        reference_type,
        reference_id,
        created_by,
      },
      { transaction },
    );

    const recipients = new Set(specific_user_ids);

    if (broadcast_all) {
      const users = await User.findAll({
        attributes: ["id"],
        where: { is_active: true },
        transaction,
      });

      users.forEach((u) => recipients.add(u.id));
    }

    if (building_id) {
      const users = await User.findAll({
        attributes: ["id"],
        where: {
          building_id,
          is_active: true,
        },
        transaction,
      });

      users.forEach((u) => recipients.add(u.id));
    }

    if (roles.length > 0) {
      const users = await User.findAll({
        attributes: ["id"],
        where: {
          role: roles,
          is_active: true,
        },
        transaction,
      });

      users.forEach((u) => recipients.add(u.id));
    }

    if (recipients.size > 0) {
      const records = [...recipients].map((userId) => ({
        notification_id: notification.id,
        user_id: userId,
      }));

      await NotificationRecipient.bulkCreate(records, { transaction });
    }

    await transaction.commit();

    return notification;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get paginated notifications for a user.
 */
const getUserNotifications = async (
  userId,
  { page = 1, limit = 10, is_read } = {},
) => {
  const offset = (page - 1) * limit;
  const where = { user_id: userId };
  if (is_read !== undefined) where.is_read = is_read === "true";

  const { count, rows } = await NotificationRecipient.findAndCountAll({
    where,
    include: [
      {
        model: Notification,
        as: "notification",
        attributes: [
          "type",
          "title",
          "content",
          "reference_type",
          "reference_id",
          "createdAt",
        ],
      },
    ],
    limit: Number(limit),
    offset: Number(offset),
    order: [["createdAt", "DESC"]],
  });

  return {
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit),
    data: rows,
  };
};

/**
 * Mark one notification as read for a user.
 */
const markAsRead = async (notificationId, userId) => {
  const recipient = await NotificationRecipient.findOne({
    where: { notification_id: notificationId, user_id: userId },
  });

  if (recipient && !recipient.is_read) {
    recipient.is_read = true;
    recipient.read_at = new Date();
    await recipient.save();
  }
  return recipient;
};

/**
 * Mark all unread notifications as read for a user.
 */
const markAllAsRead = async (userId) => {
  await NotificationRecipient.update(
    { is_read: true, read_at: new Date() },
    { where: { user_id: userId, is_read: false } },
  );
};

/**
 * Count unread notifications for a user.
 */
const getUnreadCount = async (userId) => {
  return await NotificationRecipient.count({
    where: { user_id: userId, is_read: false },
  });
};

/**
 * Create a building-manager announcement for a building or room.
 */
const createBmNotification = async (caller, { title, content, target, room_id }) => {
  if (!caller.building_id) {
    throw { status: 400, message: "Quản lý tòa nhà chưa được phân công tòa nhà nào" };
  }

  let recipientIds = [];

  if (target === "building") {
    // Find residents with active lifecycle contracts in manager's building.
    const contracts = await Contract.findAll({
      attributes: ["customer_id"],
      where: { status: ["PENDING_CHECK_IN", "ACTIVE", "EXPIRING_SOON"] },
      include: [{
        model: Room,
        as: "room",
        attributes: [],
        where: { building_id: caller.building_id },
        required: true,
      }],
    });

    recipientIds = [...new Set(contracts.map((c) => c.customer_id))];
  } else if (target === "room") {
    if (!room_id) {
      throw { status: 400, message: "Mã phòng là bắt buộc khi gửi theo phòng" };
    }

    // Ensure the room belongs to manager's building.
    const room = await Room.findByPk(room_id, { attributes: ["id", "building_id"] });
    if (!room) throw { status: 404, message: "Không tìm thấy phòng" };
    if (room.building_id !== caller.building_id) {
      throw { status: 403, message: "Phòng không thuộc tòa nhà của bạn" };
    }

    const contracts = await Contract.findAll({
      attributes: ["customer_id"],
      where: { room_id, status: ["PENDING_CHECK_IN", "ACTIVE", "EXPIRING_SOON"] },
    });

    recipientIds = [...new Set(contracts.map((c) => c.customer_id))];
  } else {
    throw { status: 400, message: "Đối tượng gửi không hợp lệ. Chỉ hỗ trợ gửi toàn tòa nhà hoặc theo phòng." };
  }

  if (recipientIds.length === 0) {
    throw { status: 404, message: "Không tìm thấy cư dân đang hoạt động cho đối tượng được chỉ định" };
  }

  const notification = await createNotification({
    type: "BM_ANNOUNCEMENT",
    title,
    content,
    target_type: target === "room" ? "ROOM" : "BUILDING",
    target_id: target === "room" ? room_id : caller.building_id,
    created_by: caller.id,
    specific_user_ids: recipientIds,
  });

  return { notification, recipient_count: recipientIds.length };
};

/**
 * Admin endpoint: get all notifications across the system.
 */
const getAllNotifications = async ({ page = 1, limit = 10, type, search } = {}) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (type) where.type = type;
  if (search) {
    const { Op } = require("sequelize");
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { content: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Notification.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "creator",
        attributes: ["id", "first_name", "last_name", "role"],
      },
      {
        model: NotificationRecipient,
        as: "recipients",
        attributes: ["id", "user_id", "is_read"],
      },
    ],
    limit: Number(limit),
    offset: Number(offset),
    order: [["createdAt", "DESC"]],
    distinct: true,
  });

  return {
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit),
    data: rows,
  };
};

module.exports = {
  createNotification,
  getUserNotifications,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  createBmNotification,
};
