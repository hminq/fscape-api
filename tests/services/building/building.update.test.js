const BuildingService = require('../../../services/building.service');
const Building = require('../../../models/building.model');
const { sequelize } = require('../../../config/db');

jest.mock('../../../models/building.model');
jest.mock('../../../models/buildingImage.model');
jest.mock('../../../models/buildingFacility.model');
jest.mock('../../../config/db', () => ({
    sequelize: {
        transaction: jest.fn(() => ({
            commit: jest.fn(),
            rollback: jest.fn()
        }))
    }
}));

describe('BuildingService - updateBuilding', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Cập nhật tòa nhà thành công', async () => {
        const mockBuilding = { 
            id: 1, 
            name: 'Old Name', 
            update: jest.fn().mockResolvedValue(true) 
        };
        Building.findByPk.mockResolvedValue(mockBuilding);
        Building.findOne.mockResolvedValue(null);
        
        jest.spyOn(BuildingService, 'getBuildingById').mockResolvedValue({ id: 1, name: 'New Name' });

        const updateData = { name: 'New Name' };
        const result = await BuildingService.updateBuilding(1, updateData);

        console.log(`[TEST]: Cập nhật tòa nhà`);
        console.log(`- Input   : ID=1, NewName="${updateData.name}"`);
        console.log(`- Expected: Name="New Name"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('New Name');
    });

    it('Cập nhật tên tòa nhà thành null', async () => {
        const mockBuilding = { 
            id: 1, 
            name: 'Building A', 
            update: jest.fn().mockRejectedValue(new Error('name cannot be null')) 
        };
        Building.findByPk.mockResolvedValue(mockBuilding);
        const expectedError = 'name cannot be null';

        console.log(`[TEST]: Cập nhật tên tòa nhà thành null`);
        console.log(`- Input   : ID=1, Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.updateBuilding(1, { name: null });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật trùng tên với tòa nhà khác', async () => {
        const mockBuilding = { id: 1, name: 'Building A' };
        Building.findByPk.mockResolvedValue(mockBuilding);
        Building.findOne.mockResolvedValue({ id: 2, name: 'Building B' });
        const expectedError = 'Building name already exists';

        console.log(`[TEST]: Cập nhật trùng tên tòa nhà khác`);
        console.log(`- Input   : ID=1, Name="Building B" (Đã tồn tại ở ID 2)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.updateBuilding(1, { name: 'Building B' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });
});
