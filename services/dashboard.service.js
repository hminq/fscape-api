const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Room = require('../models/room.model');
const RoomType = require('../models/roomType.model');
const Booking = require('../models/booking.model');
const Payment = require('../models/payment.model');
const User = require('../models/user.model');
const dayjs = require('dayjs');

class DashboardService {
  static ROOM_STATUSES = ['OCCUPIED', 'AVAILABLE', 'LOCKED'];
  static REQUEST_SUMMARY_STATUSES = ['PENDING', 'ASSIGNED', 'PRICE_PROPOSED', 'APPROVED', 'IN_PROGRESS', 'DONE', 'COMPLETED'];


  // Total room count.
  static async getTotalRooms() {
    const count = await Room.count();
    return count;
  }

  // Occupied room count.
  static async getOccupiedRooms() {
    const count = await Room.count({
      where: { status: 'OCCUPIED' }
    });
    return count;
  }

  // Revenue in the last 30 days.
  static async getRecentRevenue() {
    const thirtyDaysAgo = dayjs().subtract(30, 'day').toDate();
    const result = await Payment.sum('amount', {
      where: {
        status: 'SUCCESS',
        paid_at: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });
    return result || 0;
  }

  // Overview of available room types.
  static async getRoomTypesOverview() {
    const roomTypes = await sequelize.query(`
      SELECT
        rt.id,
        rt.name,
        rt.description,
        rt.base_price,
        COUNT(r.id)::int AS room_count
      FROM public.room_types rt
      LEFT JOIN public.rooms r
        ON r.room_type_id = rt.id
        AND r.deleted_at IS NULL
      WHERE rt.deleted_at IS NULL
      GROUP BY rt.id, rt.name, rt.description, rt.base_price
      ORDER BY room_count DESC, rt.name ASC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT,
    });

    return roomTypes;
  }

  // Monthly revenue for the last 6 months with trend.
  static async getMonthlyRevenueSummary() {
    const monthCount = 6;
    const startMonth = dayjs().startOf('month').subtract(monthCount - 1, 'month');
    const monthKeys = Array.from({ length: monthCount }, (_, index) =>
      startMonth.add(index, 'month').format('YYYY-MM'),
    );

    const payments = await Payment.findAll({
      attributes: ['amount', 'paid_at'],
      where: {
        status: 'SUCCESS',
        paid_at: {
          [Op.gte]: startMonth.toDate(),
        },
      },
      raw: true,
    });

    const revenueByMonth = monthKeys.reduce((accumulator, monthKey) => {
      accumulator[monthKey] = 0;
      return accumulator;
    }, {});

    payments.forEach((payment) => {
      const monthKey = dayjs(payment.paid_at).format('YYYY-MM');
      if (!Object.hasOwn(revenueByMonth, monthKey)) return;
      revenueByMonth[monthKey] += Number(payment.amount || 0);
    });

    const monthlyRevenue = monthKeys.map((monthKey) => {
      const monthDate = dayjs(`${monthKey}-01`);
      return {
        month_key: monthKey,
        label: `Tháng ${monthDate.format('M')}`,
        amount: revenueByMonth[monthKey],
      };
    });

    const currentMonth = monthlyRevenue[monthlyRevenue.length - 1] || { amount: 0, label: '' };
    const previousMonth = monthlyRevenue[monthlyRevenue.length - 2] || { amount: 0, label: '' };
    const delta = currentMonth.amount - previousMonth.amount;
    const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const percentChange = previousMonth.amount > 0
      ? Math.abs((delta / previousMonth.amount) * 100)
      : currentMonth.amount > 0 ? 100 : 0;

    return {
      monthly_revenue: monthlyRevenue,
      revenue_trend: {
        current_month_label: currentMonth.label,
        previous_month_label: previousMonth.label,
        current_month_amount: currentMonth.amount,
        previous_month_amount: previousMonth.amount,
        direction,
        delta_amount: delta,
        percent_change: Number(percentChange.toFixed(1)),
      },
    };
  }

  // Monthly bookings for the last 6 months with trend.
  static async getMonthlyBookingSummary() {
    const monthCount = 6;
    const startMonth = dayjs().startOf('month').subtract(monthCount - 1, 'month');
    const monthKeys = Array.from({ length: monthCount }, (_, index) =>
      startMonth.add(index, 'month').format('YYYY-MM'),
    );

    const bookings = await Booking.findAll({
      attributes: ['created_at'],
      where: {
        created_at: {
          [Op.gte]: startMonth.toDate(),
        },
      },
      raw: true,
    });

    const bookingsByMonth = monthKeys.reduce((accumulator, monthKey) => {
      accumulator[monthKey] = 0;
      return accumulator;
    }, {});

    bookings.forEach((booking) => {
      const monthKey = dayjs(booking.created_at).format('YYYY-MM');
      if (!Object.hasOwn(bookingsByMonth, monthKey)) return;
      bookingsByMonth[monthKey] += 1;
    });

    const monthlyBookings = monthKeys.map((monthKey) => {
      const monthDate = dayjs(`${monthKey}-01`);
      return {
        month_key: monthKey,
        label: `Tháng ${monthDate.format('M')}`,
        count: bookingsByMonth[monthKey],
      };
    });

    const currentMonth = monthlyBookings[monthlyBookings.length - 1] || { count: 0, label: '' };
    const previousMonth = monthlyBookings[monthlyBookings.length - 2] || { count: 0, label: '' };
    const delta = currentMonth.count - previousMonth.count;
    const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const percentChange = previousMonth.count > 0
      ? Math.abs((delta / previousMonth.count) * 100)
      : currentMonth.count > 0 ? 100 : 0;

    return {
      monthly_bookings: monthlyBookings,
      booking_trend: {
        current_month_label: currentMonth.label,
        previous_month_label: previousMonth.label,
        current_month_count: currentMonth.count,
        previous_month_count: previousMonth.count,
        direction,
        delta_count: delta,
        percent_change: Number(percentChange.toFixed(1)),
      },
    };
  }

  // Booking distribution by room type.
  static async getBookingRoomTypeSummary() {
    const roomTypeBookings = await sequelize.query(`
      SELECT
        rt.id AS room_type_id,
        rt.name,
        COUNT(b.id)::int AS booking_count
      FROM public.bookings b
      INNER JOIN public.rooms r
        ON r.id = b.room_id
        AND r.deleted_at IS NULL
      INNER JOIN public.room_types rt
        ON rt.id = r.room_type_id
        AND rt.deleted_at IS NULL
      GROUP BY rt.id, rt.name
      ORDER BY booking_count DESC, rt.name ASC
      LIMIT 6
    `, {
      type: sequelize.QueryTypes.SELECT,
    });

    const topBookedRoomType = roomTypeBookings[0]
      ? {
          room_type_id: roomTypeBookings[0].room_type_id,
          name: roomTypeBookings[0].name,
          booking_count: roomTypeBookings[0].booking_count,
        }
      : null;

    return {
      room_type_booking_distribution: roomTypeBookings,
      top_booked_room_type: topBookedRoomType,
    };
  }

  // Employee totals by active status.
  static async getEmployeeStats() {
    const employees = await User.findAll({
      where: {
        role: {
          [Op.in]: ['ADMIN', 'BUILDING_MANAGER', 'STAFF']
        }
      },
      attributes: ['is_active'],
      raw: true
    });

    let active = 0;
    let inactive = 0;

    employees.forEach(emp => {
      if (emp.is_active) active++;
      else inactive++;
    });

    return { total: employees.length, active, inactive };
  }

  static async getBuildingRoomStatusSummary(buildingId) {
    const rows = await sequelize.query(`
      SELECT status, COUNT(*)::int AS count
      FROM public.rooms
      WHERE building_id = :buildingId
        AND deleted_at IS NULL
      GROUP BY status
    `, {
      replacements: { buildingId },
      type: sequelize.QueryTypes.SELECT,
    });

    const countMap = Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));

    return this.ROOM_STATUSES.map((status) => ({
      status,
      count: countMap[status] || 0,
    }));
  }

  static async getBuildingRequestStatusSummary(buildingId) {
    const rows = await sequelize.query(`
      SELECT req.status, COUNT(*)::int AS count
      FROM public.requests req
      INNER JOIN public.rooms room
        ON room.id = req.room_id
        AND room.deleted_at IS NULL
      WHERE room.building_id = :buildingId
      GROUP BY req.status
    `, {
      replacements: { buildingId },
      type: sequelize.QueryTypes.SELECT,
    });

    const countMap = Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));

    return this.REQUEST_SUMMARY_STATUSES.map((status) => ({
      status,
      count: countMap[status] || 0,
    }));
  }

  static async getBuildingContractSummary(buildingId) {
    const [row] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE contract.status = 'PENDING_MANAGER_SIGNATURE')::int AS pending_manager_sign,
        COUNT(*) FILTER (WHERE contract.status = 'EXPIRING_SOON')::int AS expiring_soon,
        COUNT(*) FILTER (WHERE contract.status = 'ACTIVE')::int AS active
      FROM public.contracts contract
      INNER JOIN public.rooms room
        ON room.id = contract.room_id
        AND room.deleted_at IS NULL
      WHERE room.building_id = :buildingId
    `, {
      replacements: { buildingId },
      type: sequelize.QueryTypes.SELECT,
    });

    return {
      pending_manager_sign: Number(row?.pending_manager_sign || 0),
      expiring_soon: Number(row?.expiring_soon || 0),
      active: Number(row?.active || 0),
    };
  }

  static async getBuildingInvoiceSummary(buildingId) {
    const [row] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE invoice.status = 'UNPAID')::int AS unpaid,
        COUNT(*) FILTER (WHERE invoice.status = 'OVERDUE')::int AS overdue
      FROM public.invoices invoice
      INNER JOIN public.contracts contract
        ON contract.id = invoice.contract_id
      INNER JOIN public.rooms room
        ON room.id = contract.room_id
        AND room.deleted_at IS NULL
      WHERE room.building_id = :buildingId
    `, {
      replacements: { buildingId },
      type: sequelize.QueryTypes.SELECT,
    });

    return {
      unpaid: Number(row?.unpaid || 0),
      overdue: Number(row?.overdue || 0),
    };
  }

  static async getBuildingFloorOccupancy(buildingId) {
    const rows = await sequelize.query(`
      SELECT
        room.floor,
        COUNT(*)::int AS total_rooms,
        COUNT(*) FILTER (WHERE room.status = 'OCCUPIED')::int AS occupied_rooms
      FROM public.rooms room
      WHERE room.building_id = :buildingId
        AND room.deleted_at IS NULL
        AND room.floor IS NOT NULL
      GROUP BY room.floor
      ORDER BY room.floor ASC
    `, {
      replacements: { buildingId },
      type: sequelize.QueryTypes.SELECT,
    });

    return rows.map((row) => ({
      floor: row.floor,
      label: `Tầng ${row.floor}`,
      total_rooms: Number(row.total_rooms || 0),
      occupied_rooms: Number(row.occupied_rooms || 0),
      vacant_rooms: Math.max(0, Number(row.total_rooms || 0) - Number(row.occupied_rooms || 0)),
    }));
  }

  static async getBuildingRecentRequests(buildingId) {
    return sequelize.query(`
      SELECT
        req.id,
        req.request_number,
        req.request_type,
        req.title,
        req.status,
        req.created_at,
        room.room_number,
        TRIM(CONCAT(COALESCE(resident.first_name, ''), ' ', COALESCE(resident.last_name, ''))) AS resident_name
      FROM public.requests req
      INNER JOIN public.rooms room
        ON room.id = req.room_id
        AND room.deleted_at IS NULL
      INNER JOIN public.users resident
        ON resident.id = req.resident_id
      WHERE room.building_id = :buildingId
      ORDER BY req.created_at DESC
      LIMIT 5
    `, {
      replacements: { buildingId },
      type: sequelize.QueryTypes.SELECT,
    });
  }

  static async getBuildingPendingContracts(buildingId) {
    return sequelize.query(`
      SELECT
        contract.id,
        contract.contract_number,
        contract.status,
        contract.signature_expires_at,
        contract.end_date,
        room.room_number,
        TRIM(CONCAT(COALESCE(customer.first_name, ''), ' ', COALESCE(customer.last_name, ''))) AS customer_name
      FROM public.contracts contract
      INNER JOIN public.rooms room
        ON room.id = contract.room_id
        AND room.deleted_at IS NULL
      INNER JOIN public.users customer
        ON customer.id = contract.customer_id
      WHERE room.building_id = :buildingId
        AND contract.status IN ('PENDING_MANAGER_SIGNATURE', 'EXPIRING_SOON')
      ORDER BY
        CASE
          WHEN contract.status = 'PENDING_MANAGER_SIGNATURE' THEN 0
          ELSE 1
        END,
        contract.signature_expires_at ASC NULLS LAST,
        contract.end_date ASC NULLS LAST
      LIMIT 5
    `, {
      replacements: { buildingId },
      type: sequelize.QueryTypes.SELECT,
    });
  }

  static async getBuildingRecentBookings(buildingId) {
    return sequelize.query(`
      SELECT
        booking.id,
        booking.booking_number,
        booking.status,
        booking.check_in_date,
        booking.created_at,
        room.room_number,
        TRIM(CONCAT(COALESCE(customer.first_name, ''), ' ', COALESCE(customer.last_name, ''))) AS customer_name
      FROM public.bookings booking
      INNER JOIN public.rooms room
        ON room.id = booking.room_id
        AND room.deleted_at IS NULL
      INNER JOIN public.users customer
        ON customer.id = booking.customer_id
      WHERE room.building_id = :buildingId
      ORDER BY booking.created_at DESC
      LIMIT 5
    `, {
      replacements: { buildingId },
      type: sequelize.QueryTypes.SELECT,
    });
  }

  // Aggregate payload for admin dashboard.
  static async getDashboard(user) {
    if (!user || user.role !== 'ADMIN') {
      throw { status: 403, message: 'Bạn không có quyền truy cập dashboard này' };
    }

    const [
      totalRooms,
      occupiedRooms,
      recentRevenue,
      monthlyRevenueSummary,
      monthlyBookingSummary,
      bookingRoomTypeSummary,
      roomTypesOverview,
      employeeStats
    ] = await Promise.all([
      this.getTotalRooms(),
      this.getOccupiedRooms(),
      this.getRecentRevenue(),
      this.getMonthlyRevenueSummary(),
      this.getMonthlyBookingSummary(),
      this.getBookingRoomTypeSummary(),
      this.getRoomTypesOverview(),
      this.getEmployeeStats()
    ]);

    return {
      total_rooms: totalRooms,
      occupied_rooms: occupiedRooms,
      recent_revenue: recentRevenue,
      monthly_revenue: monthlyRevenueSummary.monthly_revenue,
      revenue_trend: monthlyRevenueSummary.revenue_trend,
      monthly_bookings: monthlyBookingSummary.monthly_bookings,
      booking_trend: monthlyBookingSummary.booking_trend,
      room_type_booking_distribution: bookingRoomTypeSummary.room_type_booking_distribution,
      top_booked_room_type: bookingRoomTypeSummary.top_booked_room_type,
      room_types_overview: roomTypesOverview,
      employee_stats: employeeStats
    };
  }

  static async getBuildingManagerDashboard(user) {
    if (!user || user.role !== 'BUILDING_MANAGER') {
      throw { status: 403, message: 'Bạn không có quyền truy cập dashboard quản lý tòa nhà' };
    }

    if (!user.building_id) {
      throw { status: 400, message: 'Quản lý tòa nhà chưa được phân công tòa nhà nào' };
    }

    const building = await sequelize.models.Building.findByPk(user.building_id, {
      attributes: ['id', 'name'],
      raw: true,
    });

    if (!building) {
      throw { status: 404, message: 'Không tìm thấy tòa nhà được phân công' };
    }

    const [
      roomStatusSummary,
      requestStatusSummary,
      contractSummary,
      invoiceSummary,
      floorOccupancy,
      recentRequests,
      pendingContracts,
      recentBookings,
    ] = await Promise.all([
      this.getBuildingRoomStatusSummary(user.building_id),
      this.getBuildingRequestStatusSummary(user.building_id),
      this.getBuildingContractSummary(user.building_id),
      this.getBuildingInvoiceSummary(user.building_id),
      this.getBuildingFloorOccupancy(user.building_id),
      this.getBuildingRecentRequests(user.building_id),
      this.getBuildingPendingContracts(user.building_id),
      this.getBuildingRecentBookings(user.building_id),
    ]);

    const roomCountMap = Object.fromEntries(roomStatusSummary.map((item) => [item.status, item.count]));
    const activeRequestStatuses = ['PENDING', 'ASSIGNED', 'PRICE_PROPOSED', 'APPROVED', 'IN_PROGRESS', 'DONE'];
    const activeRequests = requestStatusSummary
      .filter((item) => activeRequestStatuses.includes(item.status))
      .reduce((sum, item) => sum + item.count, 0);

    return {
      building,
      kpis: {
        occupied_rooms: roomCountMap.OCCUPIED || 0,
        available_rooms: roomCountMap.AVAILABLE || 0,
        active_requests: activeRequests,
        expiring_contracts: contractSummary.expiring_soon,
      },
      room_status_summary: roomStatusSummary,
      request_status_summary: requestStatusSummary,
      contract_summary: contractSummary,
      invoice_summary: invoiceSummary,
      floor_occupancy: floorOccupancy,
      recent_requests: recentRequests,
      pending_contracts: pendingContracts,
      recent_bookings: recentBookings,
    };
  }
}

module.exports = DashboardService;
