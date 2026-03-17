const BuildingService = require('../../../services/building.service');
const Building = require('../../../models/building.model');

jest.mock('../../../models/building.model');

describe('BuildingService - toggleBuildingStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Kích hoạt tòa nhà thành công', async () => {
        const mockBuilding = { 
            id: 1, 
            is_active: false, 
            save: jest.fn().mockResolvedValue(true) 
        };
        Building.findByPk.mockResolvedValue(mockBuilding);

        const result = await BuildingService.toggleBuildingStatus(1, true, { role: 'ADMIN' });

        console.log(`[TEST]: Kích hoạt tòa nhà (Active)`);
        console.log(`- Input   : ID=1, isActive=true`);
        console.log(`- Expected: is_active=true`);
        console.log(`- Actual  : is_active=${result.is_active}`);

        expect(result.is_active).toBe(true);
        expect(mockBuilding.save).toHaveBeenCalled();
    });

    it('Vô hiệu hóa tòa nhà thành công', async () => {
        const mockBuilding = { 
            id: 1, 
            is_active: true, 
            save: jest.fn().mockResolvedValue(true) 
        };
        Building.findByPk.mockResolvedValue(mockBuilding);

        const result = await BuildingService.toggleBuildingStatus(1, false, { role: 'ADMIN' });

        console.log(`[TEST]: Vô hiệu hóa tòa nhà (Inactive)`);
        console.log(`- Input   : ID=1, isActive=false`);
        console.log(`- Expected: is_active=false`);
        console.log(`- Actual  : is_active=${result.is_active}`);

        expect(result.is_active).toBe(false);
        expect(mockBuilding.save).toHaveBeenCalled();
    });

    it('Lỗi khi trạng thái mới trùng với trạng thái hiện tại', async () => {
        const mockBuilding = { id: 1, is_active: true };
        Building.findByPk.mockResolvedValue(mockBuilding);
        const expectedError = 'Building is already active';

        console.log(`[TEST]: Trùng trạng thái hiện tại (Building)`);
        console.log(`- Input   : ID=1, isActive=true`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.toggleBuildingStatus(1, true, { role: 'ADMIN' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('ID tòa nhà bị null khi đổi trạng thái', async () => {
        Building.findByPk.mockResolvedValue(null);
        const expectedError = 'Building not found';

        console.log(`[TEST]: Đổi trạng thái với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.toggleBuildingStatus(null, true);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
