const RoomService = require('../../../services/room.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => {
    const mockModels = {
        Room: { findAndCountAll: jest.fn(), findAll: jest.fn() },
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

const { Room, Building, Contract } = sequelize.models;

describe('RoomService - Queries', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getRoomsByBuilding', () => {
        const managerUser = { role: 'BUILDING_MANAGER', building_id: 1 };

        it('TC_ROOM_01: Lấy danh sách thành công (Happy Path)', async () => {
            Building.findByPk.mockResolvedValue({ id: 1 });
            Room.findAndCountAll.mockResolvedValue({ rows: [{ id: 101 }], count: 1 });

            const result = await RoomService.getRoomsByBuilding(1, {}, managerUser);
            expect(result.total).toBe(1);
        });

        it('TC_ROOM_02: Lỗi 403 khi MANAGER truy cập tòa nhà khác (Abnormal)', async () => {
            Building.findByPk.mockResolvedValue({ id: 2 });
            try {
                await RoomService.getRoomsByBuilding(2, {}, managerUser);
            } catch (error) {
                expect(error.status).toBe(403);
                expect(error.message).toBe('Bạn chỉ có thể xem phòng trong tòa nhà được phân công');
            }
        });

        it('TC_ROOM_03: Lỗi 404 khi tòa nhà không tồn tại (Abnormal)', async () => {
            Building.findByPk.mockResolvedValue(null);
            try {
                await RoomService.getRoomsByBuilding(999, {}, { role: 'ADMIN' });
            } catch (error) {
                expect(error.status).toBe(404);
            }
        });
    });

    describe('getMyRooms', () => {
        it('TC_ROOM_01: Trả về danh sách phòng thuê của User (Happy Path)', async () => {
            const mockUser = { id: 50 };
            Contract.findAll.mockResolvedValue([{ room: { id: 101 }, contract_number: 'C01' }]);

            const results = await RoomService.getMyRooms(mockUser);
            expect(results.length).toBe(1);
            expect(Contract.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ customer_id: 50 })
            }));
        });
    });

    describe('getRoomStats', () => {
        it('TC_ROOM_01: Trả về thống kê phòng (ADMIN) (Happy Path)', async () => {
            Room.findAll.mockResolvedValue([
                { status: 'AVAILABLE', count: 5 },
                { status: 'OCCUPIED', count: 10 }
            ]);

            const stats = await RoomService.getRoomStats({ role: 'ADMIN' });
            expect(stats.total).toBe(15);
        });
    });
});
