const FacilityService = require('../../../services/facility.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Facility: { findAndCountAll: jest.fn() }
        },
        authenticate: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

// 2. Mock individual models
jest.mock('../../../models/facility.model', () => (require('../../../config/db').sequelize.models.Facility));

const { Facility } = sequelize.models;

describe('FacilityService - getAllFacilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        Facility.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
        console.log('\n=========================================================================');
    });

    it('TC_FACILITY_GET_01: Lấy danh sách tiện ích thành công (Happy Path)', async () => {
        const mockRows = [{ id: 1, name: 'Wifi', is_active: true }];
        Facility.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { page: 1, limit: 10 };
        const result = await FacilityService.getAllFacilities(query, { role: 'ADMIN' });

        console.log(`[TEST]: Lấy danh sách tiện ích`);
        expect(result.total).toBe(1);
        expect(result.data).toHaveLength(1);
    });

    it('TC_FACILITY_GET_02: Tìm kiếm tiện ích theo tên (Search Filter)', async () => {
        const mockRows = [{ id: 2, name: 'Thang máy' }];
        Facility.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { search: 'Thang' };
        const result = await FacilityService.getAllFacilities(query, { role: 'ADMIN' });

        console.log(`[TEST]: Tìm kiếm tiện ích theo tên`);
        expect(result.data[0].name).toBe('Thang máy');
    });
});
