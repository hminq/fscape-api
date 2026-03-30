const UniversityService = require('../../../services/university.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        University: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() },
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

const { University } = sequelize.models;

describe('UniversityService - createUniversity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('TC_UNIVERSITY_01: Tạo University mới thành công (Happy Path)', async () => {
        const newData = { name: 'Đại học FPT', location_id: 1, address: 'Khu công nghệ cao' };
        University.findOne.mockResolvedValue(null);
        University.create.mockResolvedValue({ id: 5, ...newData });

        const result = await UniversityService.createUniversity(newData);

        console.log(`[TEST]: Tạo University mới`);
        console.log(`- Input   : Name="${newData.name}", LocationID=${newData.location_id}, Address="${newData.address}"`);
        console.log(`- Expected: Name="Đại học FPT"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Đại học FPT');
        expect(University.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Đại học FPT' }));
    });

    it('TC_UNIVERSITY_02: Lỗi thiếu tên trường đại học (Abnormal)', async () => {
        const newData = { name: null, location_id: 1, address: 'Hà Nội' };
        console.log(`[TEST]: Tạo University thiếu tên`);
        try {
            await UniversityService.createUniversity(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Tên trường đại học là bắt buộc');
        }
    });

    it('TC_UNIVERSITY_03: Lỗi trùng tên trường đại học (Abnormal)', async () => {
        const newData = { name: 'Đại học Bách Khoa', location_id: 1, address: 'Hà Nội' };
        University.findOne.mockResolvedValue({ id: 1, name: 'Đại học Bách Khoa' });

        console.log(`[TEST]: Trùng tên trường đại học`);
        try {
            await UniversityService.createUniversity(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toContain('đã tồn tại');
        }
    });

    it('TC_UNIVERSITY_04: Lỗi mã khu vực bị trống (Abnormal)', async () => {
        const newData = { name: 'Đại học X', location_id: null, address: '123 ABC' };
        console.log(`[TEST]: Mã khu vực bị null`);
        try {
            await UniversityService.createUniversity(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Mã khu vực là bắt buộc');
        }
    });

    it('TC_UNIVERSITY_05: Lỗi địa chỉ bị trống (Abnormal)', async () => {
        const newData = { name: 'Đại học Y', location_id: 1, address: '' };
        console.log(`[TEST]: Địa chỉ bị trống`);
        try {
            await UniversityService.createUniversity(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Địa chỉ là bắt buộc');
        }
    });
});
