const FacilityService = require('../../../services/facility.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Facility: { findByPk: jest.fn(), findOne: jest.fn() }
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

describe('FacilityService - updateFacility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Facility.findByPk.mockResolvedValue(null);
        Facility.findOne.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_FACILITY_04: Cập nhật tiện ích thành công (Happy Path)', async () => {
        const mockFacility = { 
            id: 1, 
            name: 'Wifi cũ', 
            update: jest.fn().mockResolvedValue(true) 
        };
        Facility.findByPk.mockResolvedValue(mockFacility);

        const updateData = { name: 'Wifi 5G' };
        await FacilityService.updateFacility(1, updateData);

        console.log(`[TEST]: Cập nhật tiện ích thành công`);
        expect(mockFacility.update).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });

    it('TC_FACILITY_05: Lỗi khi cập nhật trùng tên với tiện ích khác (409)', async () => {
        const mockFacility = { id: 1, name: 'Wifi' };
        Facility.findByPk.mockResolvedValue(mockFacility);
        Facility.findOne.mockResolvedValue({ id: 2, name: 'Điều hòa' });

        console.log(`[TEST]: Cập nhật trùng tên tiện ích khác`);
        try {
            await FacilityService.updateFacility(1, { name: 'Điều hòa' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(409);
            expect(error.message).toContain('đã tồn tại');
        }
    });

    it('TC_FACILITY_06: Lỗi khi cập nhật tên trống (400)', async () => {
        const mockFacility = { id: 1, name: 'Wifi' };
        Facility.findByPk.mockResolvedValue(mockFacility);

        console.log(`[TEST]: Cập nhật tên tiện ích thành trống`);
        try {
            await FacilityService.updateFacility(1, { name: '' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toBe('Tên tiện ích không được để trống');
        }
    });

    it('TC_FACILITY_07: Lỗi khi không tìm thấy tiện ích để cập nhật (404)', async () => {
        Facility.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Cập nhật tiện ích không tồn tại`);
        try {
            await FacilityService.updateFacility(999, { name: 'Test' });
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy tiện ích');
        }
    });
});
