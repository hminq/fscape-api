const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Room = require('../models/room.model');
const RoomType = require('../models/roomType.model');
const Booking = require('../models/booking.model');
const Payment = require('../models/payment.model');
const User = require('../models/user.model');
const dayjs = require('dayjs');

class DashboardService {

  // Tổng số phòng
  static async getTotalRooms() {
    const count = await Room.count();
    return count;
  }

  // Phòng đã thuê
  static async getOccupiedRooms() {
    const count = await Room.count({
      where: { status: 'OCCUPIED' }
    });
    return count;
  }

  // Doanh thu gần đây (30 ngày gần nhất)
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

  // Tổng quan các loại phòng hiện có
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

  // Doanh thu theo tháng trong 6 tháng gần nhất + xu hướng tháng hiện tại
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

  // Số lượng booking theo tháng trong 6 tháng gần nhất + xu hướng tháng hiện tại
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

  // Booking theo loại phòng để biết loại nào được chọn nhiều nhất
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

  // Tổng nhân viên (active, not active)
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

  // Payload tổng hợp cho dashboard admin
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
}

module.exports = DashboardService;
