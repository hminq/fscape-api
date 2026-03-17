const { sequelize } = require("../config/db");
const Notification = require("../models/notification.model");
const NotificationRecipient = require("../models/notificationRecipient.model");
const User = require("../models/user.model");
const Contract = require("../models/contract.model");
const Room = require("../models/room.model");

/**
 * Tạo mới thông báo và gửi đến danh sách người nhận
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
 * Lấy danh sách thông báo của 1 User (Dùng cho API Resident/Staff xem thông báo)
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
 * Đánh dấu đã đọc
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
 * Đánh dấu tất cả thông báo chưa đọc là đã đọc
 */
const markAllAsRead = async (userId) => {
  await NotificationRecipient.update(
    { is_read: true, read_at: new Date() },
    { where: { user_id: userId, is_read: false } },
  );
};

/**
 * Đếm số thông báo chưa đọc
 */
const getUnreadCount = async (userId) => {
  return await NotificationRecipient.count({
    where: { user_id: userId, is_read: false },
  });
};

/**
 * BM tạo thông báo gửi đến cư dân trong building hoặc room cụ thể
 */
const createBmNotification = async (caller, { title, content, target, room_id }) => {
  if (!caller.building_id) {
    throw { status: 400, message: "Building manager is not assigned to any building" };
  }

  let recipientIds = [];

  if (target === "building") {
    // Tìm tất cả resident có hợp đồng ACTIVE/EXPIRING_SOON trong building của BM
    const contracts = await Contract.findAll({
      attributes: ["customer_id"],
      where: { status: ["ACTIVE", "EXPIRING_SOON"] },
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
      throw { status: 400, message: "room_id is required when target is 'room'" };
    }

    // Kiểm tra room thuộc building của BM
    const room = await Room.findByPk(room_id, { attributes: ["id", "building_id"] });
    if (!room) throw { status: 404, message: "Room not found" };
    if (room.building_id !== caller.building_id) {
      throw { status: 403, message: "Room does not belong to your building" };
    }

    const contracts = await Contract.findAll({
      attributes: ["customer_id"],
      where: { room_id, status: ["ACTIVE", "EXPIRING_SOON"] },
    });

    recipientIds = [...new Set(contracts.map((c) => c.customer_id))];
  } else {
    throw { status: 400, message: "Invalid target. Must be 'building' or 'room'" };
  }

  if (recipientIds.length === 0) {
    throw { status: 404, message: "No active residents found for the specified target" };
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

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  createBmNotification,
};
