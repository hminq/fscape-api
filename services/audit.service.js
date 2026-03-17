const AuditLog = require('../models/auditLog.model');

/**
 * Ghi nhận audit log.
 *
 * @param {Object} params
 * @param {Object} params.user       - { id, role } của người thực hiện
 * @param {string} params.action     - CREATE | UPDATE | DELETE | LOGIN | LOGOUT | SIGN | APPROVE | REJECT | ASSIGN
 * @param {string} params.entityType - Tên entity (contract, building, asset, ...)
 * @param {string} params.entityId   - UUID của entity
 * @param {Object} [params.oldValue] - Giá trị cũ (JSONB)
 * @param {Object} [params.newValue] - Giá trị mới (JSONB)
 * @param {Object} [params.req]      - Express request (để lấy IP + user-agent)
 * @param {Object} [options]         - Sequelize options ({ transaction })
 */
const log = async ({ user, action, entityType, entityId, oldValue, newValue, req }, options = {}) => {
    return AuditLog.create({
        user_id: user?.id || null,
        user_role: user?.role || null,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        old_value: oldValue || null,
        new_value: newValue || null,
        ip_address: req?.ip || null,
        user_agent: req?.get?.('user-agent') || null,
    }, options);
};

module.exports = { log };
