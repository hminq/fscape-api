const UniversityService = require('../../../services/university.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        University: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
        Location: { findByPk: jest.fn() },
        Building: { findByPk: jest.fn() }
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
jest.mock('../../../models/university.model', () => (require('../../../config/db').sequelize.models.University));
jest.mock('../../../models/location.model', () => (require('../../../config/db').sequelize.models.Location));
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));

const { University } = sequelize.models;

describe('UniversityService - deleteUniversity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('TC_UNIVERSITY_12: Xóa University thành công (Happy Path)', async () => {
        const mockUni = { 
            id: 1, 
            name: 'Đại học Bách Khoa', 
            destroy: jest.fn().mockResolvedValue(true) 
        };
        University.findByPk.mockResolvedValue(mockUni);

        const result = await UniversityService.deleteUniversity(1);

        console.log(`[TEST]: Xóa University thành công`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: Đã xóa trường đại học "Đại học Bách Khoa" thành công`);
        console.log(`- Actual  : "${result.message}"`);

        expect(result.message).toBe('Đã xóa trường đại học "Đại học Bách Khoa" thành công');
        expect(mockUni.destroy).toHaveBeenCalled();
    });

    it('TC_UNIVERSITY_13: Lỗi khi xóa University không tồn tại (Abnormal)', async () => {
        University.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Xóa University không tồn tại`);
        try {
            await UniversityService.deleteUniversity(999);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy trường đại học');
        }
    });
});
