const RoomService = require('../../../services/room.service');
const { sequelize } = require('../../../config/db');
const { Op } = require('sequelize');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Room: { findAll: jest.fn() },
        Building: { findByPk: jest.fn() },
        Contract: { findAll: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            fn: jest.fn(),
            col: jest.fn(),
            transaction: jest.fn().mockResolvedValue({ commit: jest.fn(), rollback: jest.fn() })
        }
    };
});

// Mock individual models to prevent DB connections
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));
jest.mock('../../../models/contract.model', () => (require('../../../config/db').sequelize.models.Contract));
jest.mock('../../../models/roomImage.model', () => ({}));
jest.mock('../../../models/roomType.model', () => ({}));

const { Room, Building, Contract } = sequelize.models;

describe('RoomService - Queries', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getRoomsByBuilding', () => {
        const managerUser = { role: 'BUILDING_MANAGER', building_id: 1 };

        it('TC_ROOM_QU_01: Lấy danh sách thành công - Trả về Array (Happy Path)', async () => {
            const mockRooms = [
                { id: 1, toJSON: () => ({ id: 1, images: [] }) },
                { id: 2, toJSON: () => ({ id: 2, images: [] }) }
            ];
            Room.findAll.mockResolvedValue(mockRooms);

            const result = await RoomService.getRoomsByBuilding(1, {}, managerUser);
            
            console.log(`[TEST]: Lấy danh sách phòng theo tòa nhà - Check Array length`);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(2);
            expect(Room.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: { building_id: 1 }
            }));
        });

        it('TC_ROOM_QU_02: Lỗi 403 khi MANAGER truy cập tòa nhà khác (Abnormal)', async () => {
            try {
                await RoomService.getRoomsByBuilding(2, {}, managerUser);
                throw new Error('Should have thrown error');
            } catch (error) {
                expect(error.status).toBe(403);
                expect(error.message).toBe('Bạn chỉ có thể xem phòng trong tòa nhà được phân công');
            }
        });
    });

    describe('getMyRooms', () => {
        it('TC_ROOM_QU_03: Trả về danh sách phòng thuê của User (Happy Path)', async () => {
            const userId = 50;
            Contract.findAll.mockResolvedValue([{ room: { id: 101 }, contract_number: 'C01' }]);

            const results = await RoomService.getMyRooms(userId);
            expect(results).toHaveLength(1);
            expect(Contract.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ customer_id: userId })
            }));
        });
    });

    describe('getRoomStats', () => {
        it('TC_ROOM_QU_04: Thống kê đúng số lượng và phân loại (Happy Path)', async () => {
            // Mock trả về 3 phòng riêng lẻ để service đếm
            const mockRooms = [
                { status: 'AVAILABLE', building_id: 1, building: { name: 'B1' } },
                { status: 'AVAILABLE', building_id: 1, building: { name: 'B1' } },
                { status: 'LOCKED', building_id: 1, building: { name: 'B1' } }
            ];
            Room.findAll.mockResolvedValue(mockRooms);

            const stats = await RoomService.getRoomStats({ role: 'ADMIN' });

            console.log(`[TEST]: Thống kê phòng - Check counts`);
            expect(stats.total).toBe(3);
            expect(stats.by_status.available).toBe(2);
            expect(stats.by_status.locked).toBe(1);
            expect(stats.by_building[0].count).toBe(3);
        });
    });
});
