const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Room = require('../models/room.model');
const RoomType = require('../models/roomType.model');
const Booking = require('../models/booking.model');
const Payment = require('../models/payment.model');
const User = require('../models/user.model');
const Building = require('../models/building.model');
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

  // Phân bố loại phòng
  static async getRoomTypeDistribution() {
    const rooms = await Room.findAll({
      include: [{
        model: RoomType,
        as: 'room_type',
        attributes: ['name']
      }],
      attributes: ['room_type_id'],
      raw: true
    });

    const distribution = {};
    rooms.forEach(room => {
      const typeName = room['room_type.name'] || 'Unknown';
      distribution[typeName] = (distribution[typeName] || 0) + 1;
    });

    return Object.entries(distribution).map(([name, count]) => ({ name, count }));
  }

  // Tổng quan các loại phòng hiện có
  static async getRoomTypesOverview() {
    const roomTypes = await RoomType.findAll({
      include: [{
        model: Room,
        as: 'rooms',
        attributes: []
      }],
      attributes: [
        'id',
        'name',
        'description',
        'base_price',
        [sequelize.fn('COUNT', sequelize.col('rooms.id')), 'room_count']
      ],
      group: ['RoomType.id', 'RoomType.name', 'RoomType.description', 'RoomType.base_price'],
      raw: true
    });

    return roomTypes;
  }

  // Đặt phòng gần đây (10 cái gần nhất)
  static async getRecentBookings() {
    const bookings = await Booking.findAll({
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['room_number'],
          include: [{
            model: Building,
            as: 'building',
            attributes: ['name']
          }]
        },
        {
          model: User,
          as: 'customer',
          attributes: ['first_name', 'last_name', 'email']
        }
      ],
      attributes: ['id', 'booking_number', 'check_in_date', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    return bookings.map(booking => ({
      id: booking.id,
      booking_number: booking.booking_number,
      check_in_date: booking.check_in_date,
      created_at: booking.created_at,
      room: `${booking.room.building.name} - ${booking.room.room_number}`,
      customer: `${booking.customer.first_name} ${booking.customer.last_name} (${booking.customer.email})`
    }));
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

  // Tất cả stats cho dashboard
  static async getDashboardStats() {
    const [
      totalRooms,
      occupiedRooms,
      recentRevenue,
      roomTypeDistribution,
      roomTypesOverview,
      recentBookings,
      employeeStats
    ] = await Promise.all([
      this.getTotalRooms(),
      this.getOccupiedRooms(),
      this.getRecentRevenue(),
      this.getRoomTypeDistribution(),
      this.getRoomTypesOverview(),
      this.getRecentBookings(),
      this.getEmployeeStats()
    ]);

    return {
      total_rooms: totalRooms,
      occupied_rooms: occupiedRooms,
      recent_revenue: recentRevenue,
      room_type_distribution: roomTypeDistribution,
      room_types_overview: roomTypesOverview,
      recent_bookings: recentBookings,
      employee_stats: employeeStats
    };
  }
}

module.exports = DashboardService;