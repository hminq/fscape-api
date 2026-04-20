const FacilityService = require('../../../services/facility.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Facility: { findOne: jest.fn(), create: jest.fn() }
        },
        fn: jest.fn(),
        col: jest.fn(),
        where: jest.fn(),
        authenticate: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

// 2. Mock individual models
jest.mock('../../../models/facility.model', () => (require('../../../config/db').sequelize.models.Facility));

const { Facility } = sequelize.models;

describe('FacilityService - createFacility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Facility.findOne.mockResolvedValue(null);
        Facility.create.mockResolvedValue({ id: 1 });
        console.log('\n=========================================================================');
    });

    it('TC_FACILITY_01: Tạo tiện ích mới thành công (Happy Path)', async () => {
        const newData = { name: 'Máy lọc nước', is_active: true };
        Facility.create.mockResolvedValue({ id: 10, ...newData });

        const result = await FacilityService.createFacility(newData);

        console.log(`[TEST]: Tạo tiện ích mới thành công`);
        expect(result.name).toBe('Máy lọc nước');
        expect(Facility.create).toHaveBeenCalled();
    });

    it('TC_FACILITY_02: Lỗi khi tên tiện ích trống (400)', async () => {
        const newData = { name: '' };
        console.log(`[TEST]: Tạo tiện ích với tên trống`);
        try {
            await FacilityService.createFacility(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toBe('Tên tiện ích không được để trống');
        }
    });

    it('TC_FACILITY_03: Lỗi khi trùng tên tiện ích (409)', async () => {
        const newData = { name: 'Wifi' };
        Facility.findOne.mockResolvedValue({ id: 1, name: 'Wifi' });

        console.log(`[TEST]: Trùng tên tiện ích`);
        try {
            await FacilityService.createFacility(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(409);
            expect(error.message).toContain('đã tồn tại');
        }
    });
});
