const { Op } = require('sequelize');
const AuditLog = require('../models/auditLog.model');
const User = require('../models/user.model');
const { ROLES } = require('../constants/roles');
const { parseLocalDate } = require('../utils/date.util');

class AuditLogService {
  /**
   * List audit logs with filters.
   * ADMIN sees all. BUILDING_MANAGER sees logs from users in their building only.
   */
  static async list(caller, query = {}) {
    const {
      page = 1,
      limit = 10,
      action,
      entity_type,
      user_id,
      from,
      to,
      search,
      system,
    } = query;

    const offset = (Number(page) - 1) * Number(limit);
    const where = {};

    // --- Filters ---
    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = user_id;

    // System logs: user_id IS NULL
    if (system === 'true') {
      where.user_id = { [Op.is]: null };
    }

    // Date range
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = parseLocalDate(from);
      if (to) {
        const end = parseLocalDate(to);
        end.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = end;
      }
    }

    // BM scope: only logs performed by users in their building
    const includeUser = {
      model: User,
      as: 'performer',
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'avatar_url', 'building_id'],
    };

    if (caller.role === ROLES.BUILDING_MANAGER) {
      if (!caller.building_id) {
        throw new Error('Building manager is not assigned to any building');
      }
      includeUser.where = { building_id: caller.building_id };
      includeUser.required = true;
    } else {
      includeUser.required = false;
    }

    // Search by performer name or email
    if (search) {
      includeUser.where = {
        ...(includeUser.where || {}),
        [Op.or]: [
          { first_name: { [Op.iLike]: `%${search}%` } },
          { last_name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ],
      };
      includeUser.required = true;
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [includeUser],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset,
    });

    return {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / Number(limit)),
      data: rows,
    };
  }

  /**
   * Get distinct entity_type values for filter dropdowns.
   */
  static async getEntityTypes() {
    const results = await AuditLog.findAll({
      attributes: [[AuditLog.sequelize.fn('DISTINCT', AuditLog.sequelize.col('entity_type')), 'entity_type']],
      raw: true,
    });
    return results.map((r) => r.entity_type).sort();
  }
}

module.exports = AuditLogService;
