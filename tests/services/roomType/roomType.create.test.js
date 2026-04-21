const RoomTypeService = require('../../../services/roomType.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        RoomType: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), count: jest.fn(), findAndCountAll: jest.fn() },
        Room: { count: jest.fn() },
        RoomTypeAsset: { findAll: jest.fn(), destroy: jest.fn(), bulkCreate: jest.fn() },
        AssetType: { findAll: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            transaction: jest.fn().mockResolvedValue({ 
                commit: jest.fn(), 
                rollback: jest.fn()
            }),
            authenticate: jest.fn().mockResolvedValue(),
            close: jest.fn().mockResolvedValue(),
            fn: jest.fn(),
            col: jest.fn(),
            where: jest.fn()
        },
        connectDB: jest.fn().mockResolvedValue()
    };
});

// Mock individual models
jest.mock('../../../models/roomType.model', () => (require('../../../config/db').sequelize.models.RoomType));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/roomTypeAsset.model', () => (require('../../../config/db').sequelize.models.RoomTypeAsset));
jest.mock('../../../models/assetType.model', () => (require('../../../config/db').sequelize.models.AssetType));

const { RoomType } = sequelize.models;

describe('RoomTypeService - createRoomType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        RoomType.findOne.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_ROOM_TYPE_01: Tạo loại phòng thành công (Happy Path)', async () => {
        const newData = { name: 'Phòng Mới', base_price: 1500000 };
        RoomType.create.mockResolvedValue({ id: 1, ...newData, deposit_months: 1 });

        const result = await RoomTypeService.createRoomType(newData);

        console.log(`[TEST]: Tạo loại phòng hợp lệ`);
        console.log(`- Input   : Name="Phòng Mới", base_price=1500000`);
        console.log(`- Expected: Gửi yêu cầu create vào DB`);

        expect(RoomType.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Phòng Mới',
            base_price: 1500000,
            deposit_months: 1
        }));
        expect(result.id).toBe(1);
    });

    it('TC_ROOM_TYPE_02: Lỗi thiếu tên gọi (Abnormal)', async () => {
        console.log(`[TEST]: Tạo loại phòng thiếu tên`);
        try {
            await RoomTypeService.createRoomType({ base_price: 1000000 });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Tên loại phòng là bắt buộc');
        }
    });

    it('TC_ROOM_TYPE_03: Lỗi trùng tên loại phòng (Abnormal)', async () => {
        const newData = { name: 'Phòng Cũ', base_price: 1000000 };
        RoomType.findOne.mockResolvedValue({ id: 2, name: 'Phòng Cũ' });

        console.log(`[TEST]: Tạo loại phòng bị trùng tên`);
        try {
            await RoomTypeService.createRoomType(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toContain('đã tồn tại');
        }
    });

    it('TC_ROOM_TYPE_04: Lỗi sức chứa không hợp lệ (Abnormal)', async () => {
        const newData = { name: 'Phòng Lỗi', base_price: 100000, capacity_min: 5, capacity_max: 2 };

        console.log(`[TEST]: Tạo phòng sức chứa tối thiểu > tối đa`);
        try {
            await RoomTypeService.createRoomType(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Sức chứa tối thiểu phải nhỏ hơn hoặc bằng sức chứa tối đa');
        }
    });

    it('TC_ROOM_TYPE_05: Lỗi số lượng phòng ngủ vượt giới hạn (Abnormal)', async () => {
        const newData = { name: 'Phòng VIP', base_price: 100, bedrooms: 50 };

        console.log(`[TEST]: Số phòng ngủ vượt quá tối đa (10)`);
        try {
            await RoomTypeService.createRoomType(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Số phòng ngủ phải từ 1 đến 10');
        }
    });

    it('TC_ROOM_TYPE_06: Lỗi diện tích không hợp lệ (Abnormal)', async () => {
        const newData = { name: 'Phòng Nhỏ', base_price: 100, area_sqm: 2000 };

        console.log(`[TEST]: Diện tích vượt quá giới hạn (1000 m²)`);
        try {
            await RoomTypeService.createRoomType(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Diện tích phải lớn hơn 0 và không quá 1000 m²');
        }
    });
});
