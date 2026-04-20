const FacilityService = require('../../../services/facility.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Facility: { findByPk: jest.fn() }
        },
        authenticate: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

// 2. Mock individual models
jest.mock('../../../models/facility.model', () => (require('../../../config/db').sequelize.models.Facility));

const { Facility } = sequelize.models;

describe('FacilityService - getFacilityById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Facility.findByPk.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_FACILITY_GET_03: Lấy chi tiết tiện ích thành công (Happy Path)', async () => {
        const mockFacility = { 
            id: 1, 
            name: 'Điều hòa',
            buildings: []
        };
        Facility.findByPk.mockResolvedValue(mockFacility);

        const result = await FacilityService.getFacilityById(1);

        console.log(`[TEST]: Lấy chi tiết tiện ích thành công`);
        expect(result.name).toBe('Điều hòa');
    });

    it('TC_FACILITY_GET_04: Lỗi khi không tìm thấy tiện ích (404)', async () => {
        Facility.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Truy vấn tiện ích không tồn tại`);
        try {
            await FacilityService.getFacilityById(999);
            throw new Error('Should have thrown error');
        } catch (error) {
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy tiện ích');
        }
    });
});
