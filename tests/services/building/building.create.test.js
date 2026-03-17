const BuildingService = require('../../../services/building.service');
const Building = require('../../../models/building.model');
const { sequelize } = require('../../../config/db');
const User = require('../../../models/user.model');

jest.mock('../../../models/building.model');
jest.mock('../../../models/user.model');
jest.mock('../../../models/buildingImage.model');
jest.mock('../../../models/buildingFacility.model');
jest.mock('../../../models/room.model');
jest.mock('../../../models/university.model');
jest.mock('../../../models/roomType.model');
jest.mock('../../../config/db', () => ({
    sequelize: {
        transaction: jest.fn(() => ({
            commit: jest.fn(),
            rollback: jest.fn()
        }))
    }
}));

describe('BuildingService - createBuilding', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Tạo tòa nhà thành công', async () => {
        const newData = { name: 'Happy House', location_id: 1, total_floors: 5 };
        Building.findOne.mockResolvedValue(null);
        Building.create.mockResolvedValue({ id: 1, ...newData });
        
        // Mock getBuildingById which is called at the end
        jest.spyOn(BuildingService, 'getBuildingById').mockResolvedValue({ id: 1, ...newData });

        const result = await BuildingService.createBuilding(newData);

        console.log(`[TEST]: Tạo tòa nhà mới`);
        console.log(`- Input   : Name="${newData.name}", Floors=${newData.total_floors}`);
        console.log(`- Expected: Name="Happy House"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Happy House');
    });

    it('Tên tòa nhà bị null', async () => {
        const newData = { name: null };
        Building.findOne.mockResolvedValue(null);
        Building.create.mockRejectedValue(new Error('name cannot be null'));
        const expectedError = 'name cannot be null';

        console.log(`[TEST]: Tạo tòa nhà với tên bị null`);
        console.log(`- Input   : Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.createBuilding(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Số tầng vượt quá giới hạn (100 tầng)', async () => {
        const newData = { name: 'Burj Khalifa Clone', total_floors: 150 };
        const expectedError = 'A building can have a maximum of 100 floors';

        console.log(`[TEST]: Lỗi vượt quá số tầng tối đa`);
        console.log(`- Input   : TotalFloors=${newData.total_floors}`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.createBuilding(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Trùng tên tòa nhà', async () => {
        const newData = { name: 'Existing Building' };
        Building.findOne.mockResolvedValue({ id: 5, name: 'Existing Building' });
        const expectedError = 'Building "Existing Building" already exists';

        console.log(`[TEST]: Trùng tên tòa nhà`);
        console.log(`- Input   : Name="Existing Building"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.createBuilding(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });
});
