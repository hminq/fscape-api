const UniversityService = require('../../../services/university.service');
const University = require('../../../models/university.model');
const { sequelize } = require('../../../config/db');

jest.mock('../../../config/db', () => ({
    sequelize: {
        define: jest.fn().mockReturnValue({
            associate: jest.fn(),
            belongsTo: jest.fn(),
            hasMany: jest.fn(),
            hasOne: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            destroy: jest.fn(),
            findByPk: jest.fn(),
            save: jest.fn()
        }),
        models: {},
        authenticate: jest.fn().mockResolvedValue(),
        sync: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue(),
        transaction: jest.fn(),
        fn: jest.fn(),
        col: jest.fn(),
        where: jest.fn()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

jest.mock('../../../models/university.model');
jest.mock('../../../models/location.model', () => ({}));
jest.mock('../../../models/building.model', () => ({}));

describe('UniversityService - CRUD operations', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    describe('createUniversity', () => {
        it('TC_UNI_01: Create university successfully', async () => {
            const newData = { name: 'HUST', location_id: 1, address: 'Dai Co Viet' };
            University.findOne.mockResolvedValue(null);
            University.create.mockResolvedValue({ id: 1, ...newData });

            const result = await UniversityService.createUniversity(newData);

            console.log(`[TEST]: Create university successfully`);
            console.log(`- Input   : Name="${newData.name}", LocationID=${newData.location_id}`);
            console.log(`- Expected: Name="HUST"`);
            expect(result.name).toBe('HUST');
        });

        it('TC_UNI_02: Create failed - Missing required fields', async () => {
            const newData = { name: 'Empty Uni' };
            console.log(`[TEST]: Create university failed (Missing location/address)`);
            try {
                await UniversityService.createUniversity(newData);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.status).toBe(400);
            }
        });

        it('TC_UNI_03: Create failed - Duplicate name', async () => {
            const newData = { name: 'HUST', location_id: 1, address: 'Street' };
            University.findOne.mockResolvedValue({ id: 10, name: 'HUST' });
            console.log(`[TEST]: Create university failed (Duplicate name)`);
            try {
                await UniversityService.createUniversity(newData);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.status).toBe(409);
            }
        });
    });

    describe('updateUniversity', () => {
        it('TC_UNI_04: Update university successfully', async () => {
            const id = 1;
            const updateData = { address: 'New Address' };
            const mockUni = { id, name: 'HUST', update: jest.fn().mockResolvedValue(true) };
            University.findByPk.mockResolvedValue(mockUni);

            await UniversityService.updateUniversity(id, updateData);

            console.log(`[TEST]: Update university successfully`);
            expect(mockUni.update).toHaveBeenCalled();
        });

        it('TC_UNI_05: Update failed - Not found', async () => {
            University.findByPk.mockResolvedValue(null);
            console.log(`[TEST]: Update university failed (Not found)`);
            try {
                await UniversityService.updateUniversity(999, { name: 'X' });
            } catch (error) {
                expect(error.status).toBe(404);
            }
        });
    });

    describe('deleteUniversity', () => {
        it('TC_UNI_06: Delete university successfully', async () => {
            const id = 1;
            const mockUni = { id, name: 'HUST', destroy: jest.fn().mockResolvedValue(true) };
            University.findByPk.mockResolvedValue(mockUni);

            const result = await UniversityService.deleteUniversity(id);

            console.log(`[TEST]: Delete university successfully`);
            expect(result.message).toContain('HUST');
            expect(mockUni.destroy).toHaveBeenCalled();
        });
    });
});
