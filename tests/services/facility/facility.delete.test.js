const FacilityService = require('../../../services/facility.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Facility: { findByPk: jest.fn() },
            BuildingFacility: { count: jest.fn() }
        },
        authenticate: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

// 2. Mock individual models
jest.mock('../../../models/facility.model', () => (require('../../../config/db').sequelize.models.Facility));
jest.mock('../../../models/buildingFacility.model', () => (require('../../../config/db').sequelize.models.BuildingFacility));

const { Facility, BuildingFacility } = sequelize.models;

describe('FacilityService - deleteFacility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Facility.findByPk.mockResolvedValue(null);
        BuildingFacility.count.mockResolvedValue(0);
        console.log('\n=========================================================================');
    });

    it('TC_FACILITY_01: Xóa tiện ích thành công (Happy Path)', async () => {
        const mockFacility = { 
            id: 1, 
            name: 'Gym', 
            destroy: jest.fn().mockResolvedValue(true) 
        };
        Facility.findByPk.mockResolvedValue(mockFacility);
        BuildingFacility.count.mockResolvedValue(0);

        const result = await FacilityService.deleteFacility(1);

        console.log(`[TEST]: Xóa tiện ích thành công`);
        expect(result.message).toContain('thành công');
        expect(mockFacility.destroy).toHaveBeenCalled();
    });

    it('TC_FACILITY_02: Lỗi không thể xóa vì có tòa nhà đang sử dụng (400)', async () => {
        const mockFacility = { id: 1, name: 'Bể bơi' };
        Facility.findByPk.mockResolvedValue(mockFacility);
        BuildingFacility.count.mockResolvedValue(3); 

        console.log(`[TEST]: Chặn xóa tiện ích đang được gán cho tòa nhà`);
        try {
            await FacilityService.deleteFacility(1);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).toContain('đang được gán cho 3 tòa nhà');
        }
    });

    it('TC_FACILITY_03: Lỗi khi không tìm thấy tiện ích để xóa (404)', async () => {
        Facility.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Xóa tiện ích không tồn tại`);
        try {
            await FacilityService.deleteFacility(999);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy tiện ích');
        }
    });
});
