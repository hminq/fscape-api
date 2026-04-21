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

describe('UniversityService - updateUniversity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định
        University.findOne.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    it('TC_UNIVERSITY_01: Cập nhật University thành công (Happy Path)', async () => {
        const mockUni = { 
            id: 1, 
            name: 'Đại học A', 
            update: jest.fn().mockImplementation(function(data) {
                return Promise.resolve({ ...this, ...data });
            }) 
        };
        University.findByPk.mockResolvedValue(mockUni);

        const updateData = { name: 'Đại học A Updated' };
        const result = await UniversityService.updateUniversity(1, updateData);

        console.log(`[TEST]: Cập nhật University`);
        console.log(`- Input   : ID=1, NewName="${updateData.name}"`);
        console.log(`- Expected: Name="Đại học A Updated"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Đại học A Updated');
        expect(mockUni.update).toHaveBeenCalled();
    });

    it('TC_UNIVERSITY_02: Lỗi cập nhật tên University trống (Abnormal)', async () => {
        const mockUni = { id: 1, name: 'Đại học A' };
        University.findByPk.mockResolvedValue(mockUni);

        console.log(`[TEST]: Cập nhật tên University thành null/empty`);
        try {
            await UniversityService.updateUniversity(1, { name: '' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Tên trường đại học không được để trống');
        }
    });

    it('TC_UNIVERSITY_03: Lỗi cập nhật mã khu vực trống (Abnormal)', async () => {
        const mockUni = { id: 1, name: 'Đại học A' };
        University.findByPk.mockResolvedValue(mockUni);

        console.log(`[TEST]: Cập nhật University với khu vực bị null`);
        try {
            await UniversityService.updateUniversity(1, { location_id: null });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Mã khu vực không được để trống');
        }
    });

    it('TC_UNIVERSITY_04: Lỗi cập nhật địa chỉ trống (Abnormal)', async () => {
        const mockUni = { id: 1, name: 'Đại học A' };
        University.findByPk.mockResolvedValue(mockUni);

        console.log(`[TEST]: Cập nhật University với địa chỉ bị null`);
        try {
            await UniversityService.updateUniversity(1, { address: '' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Địa chỉ không được để trống');
        }
    });

    it('TC_UNIVERSITY_05: Lỗi cập nhật trùng tên với University khác (Abnormal)', async () => {
        const mockUni = { id: 1, name: 'Đại học A' };
        University.findByPk.mockResolvedValue(mockUni);
        University.findOne.mockResolvedValue({ id: 2, name: 'Đại học B' });

        console.log(`[TEST]: Cập nhật trùng tên University khác`);
        try {
            await UniversityService.updateUniversity(1, { name: 'Đại học B' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe('Tên trường đại học đã tồn tại');
        }
    });

    it('TC_UNIVERSITY_06: Lỗi cập nhật trường không tồn tại (Abnormal)', async () => {
        University.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Cập nhật ID không tồn tại`);
        try {
            await UniversityService.updateUniversity(999, { name: 'New Name' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy trường đại học');
        }
    });
});
