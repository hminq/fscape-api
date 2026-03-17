const crypto = require('crypto');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const User = require('../models/user.model');
const Building = require('../models/building.model');
const { AuthProvider } = require('../models/authProvider.model');
const { ROLES, ADMIN_MANAGEABLE_ROLES } = require('../constants/roles');

class AdminUserService {

  // =========================
  // CREATE INTERNAL USER
  // =========================
  static async createInternalUser(payload) {
    const { email, role, first_name, last_name, phone, building_id } = payload;

    // --- Required fields ---
    if (!email || !role || !first_name || !last_name || !phone) {
      throw new Error('email, role, first_name, last_name, and phone are required');
    }

    // --- Format validation ---
    if (!ADMIN_MANAGEABLE_ROLES.includes(role)) {
      throw new Error(`Role must be one of: ${ADMIN_MANAGEABLE_ROLES.join(', ')}`);
    }

    const generatedPassword = crypto.randomBytes(4).toString('hex');

    if (phone.length < 9 || phone.length > 15) {
      throw new Error('Phone must be between 9 and 15 characters');
    }

    // --- Email uniqueness ---
    const existed = await User.findOne({ where: { email } });
    if (existed) {
      throw new Error('Email already exists');
    }

    // --- Building validation ---
    if (building_id) {
      const building = await Building.findByPk(building_id);
      if (!building) {
        throw new Error('Building not found');
      }

      if (role === ROLES.BUILDING_MANAGER) {
        const existingManager = await User.findOne({
          where: {
            building_id,
            role: ROLES.BUILDING_MANAGER,
            is_active: true,
          },
        });
        if (existingManager) {
          throw new Error('This building already has an active manager');
        }
      }
    }

    // --- Create user + auth provider ---
    const user = await sequelize.transaction(async (t) => {
      const createdUser = await User.create(
        { email, role, first_name, last_name, phone, building_id, is_active: true },
        { transaction: t }
      );

      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      await AuthProvider.create(
        {
          user_id: createdUser.id,
          provider: 'EMAIL',
          provider_id: email,
          password_hash: passwordHash,
          is_verified: true,
        },
        { transaction: t }
      );

      return createdUser;
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      building_id: user.building_id,
      is_active: user.is_active,
      generated_password: generatedPassword,
    };
  }

  // =========================
  // GET USERS (role-scoped)
  // =========================
  static async getUsers(caller, { page = 1, limit = 10, search, role, is_active, building_id } = {}) {
    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (building_id === 'none') {
      where.building_id = null;
    } else if (building_id) {
      where.building_id = building_id;
    }

    if (caller.role === ROLES.ADMIN) {
      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: [
          'id', 'email', 'role', 'first_name', 'last_name',
          'phone', 'avatar_url', 'building_id', 'is_active',
          'createdAt',
        ],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset,
      });

      return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows,
      };
    }

    if (caller.role === ROLES.BUILDING_MANAGER) {
      if (!caller.building_id) {
        throw new Error('Building manager is not assigned to any building');
      }

      where.building_id = caller.building_id;

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: [
          'id', 'email', 'role', 'first_name', 'last_name',
          'phone', 'avatar_url', 'is_active',
        ],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset,
      });

      return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows,
      };
    }

    throw new Error('Permission denied');
  }

  // =========================
  // GET AVAILABLE MANAGERS
  // =========================
  static async getAvailableManagers() {
    const managers = await User.findAll({
      where: {
        role: ROLES.BUILDING_MANAGER,
        is_active: true,
        building_id: null,
      },
      attributes: ['id', 'email', 'first_name', 'last_name', 'phone'],
      order: [['first_name', 'ASC']],
    });

    return managers;
  }

  // =========================
  // GET USER STATS (counts by role + active/inactive)
  // =========================
  static async getUserStats(caller) {
    const where = {};

    if (caller.role === ROLES.BUILDING_MANAGER) {
      if (!caller.building_id) throw new Error('Building manager is not assigned to any building');
      where.building_id = caller.building_id;
    }

    const users = await User.findAll({
      where,
      attributes: ['role', 'is_active'],
      raw: true,
    });

    const byRole = {};
    let active = 0;
    let inactive = 0;

    for (const u of users) {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
      if (u.is_active) active++;
      else inactive++;
    }

    const byRoleArray = Object.entries(byRole).map(([role, count]) => ({ role, count }));

    return { total: users.length, active, inactive, by_role: byRoleArray };
  }

  // =========================
  // UPDATE USER STATUS
  // =========================
  static async updateUserStatus(userId, isActive) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === ROLES.ADMIN) {
      throw new Error('Cannot change admin account status');
    }

    if (user.is_active === isActive) {
      throw new Error(`User status is already ${isActive ? 'active' : 'inactive'}`);
    }

    user.is_active = isActive;
    await user.save();

    return user;
  }
  // =========================
  // ASSIGN BUILDING TO USER
  // =========================
  static async assignBuilding(userId, buildingId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    if (!ADMIN_MANAGEABLE_ROLES.includes(user.role)) {
      throw new Error('Can only assign buildings to managers or staff');
    }

    // buildingId = null means unassign
    if (buildingId) {
      const building = await Building.findByPk(buildingId);
      if (!building) throw new Error('Building not found');

      // BM uniqueness: one active BM per building
      if (user.role === ROLES.BUILDING_MANAGER) {
        const existingBM = await User.findOne({
          where: {
            building_id: buildingId,
            role: ROLES.BUILDING_MANAGER,
            is_active: true,
            id: { [Op.ne]: userId },
          },
        });
        if (existingBM) {
          throw new Error('This building already has an active manager. Remove the current manager first.');
        }
      }
    }

    user.building_id = buildingId;
    await user.save();

    return user;
  }
}

module.exports = AdminUserService;
