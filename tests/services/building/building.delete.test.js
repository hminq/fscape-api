const BuildingService = require('../../../services/building.service');
const Building = require('../../../models/building.model');
const Room = require('../../../models/room.model');

jest.mock('../../../models/building.model');
jest.mock('../../../models/room.model');

describe('BuildingService - deleteBuilding', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Xóa tòa nhà thành công', async () => {
        const mockBuilding = { 
            id: 1, 
            name: 'Building A', 
            destroy: jest.fn().mockResolvedValue(true) 
        };
        Building.findByPk.mockResolvedValue(mockBuilding);
        Room.count.mockResolvedValue(0);

        const result = await BuildingService.deleteBuilding(1);

        console.log(`[TEST]: Xóa tòa nhà thành công`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: "Building \"Building A\" deleted successfully"`);
        console.log(`- Actual  : "${result.message}"`);

        expect(result.message).toContain('deleted successfully');
    });

    it('Không thể xóa tòa nhà vì có phòng liên kết', async () => {
        const mockBuilding = { id: 1, name: 'Building A' };
        Building.findByPk.mockResolvedValue(mockBuilding);
        Room.count.mockResolvedValue(5);
        const expectedError = 'Building cannot be deleted because it contains 5 associated room(s). Delete the rooms first.';

        console.log(`[TEST]: Lỗi xóa tòa nhà có phòng`);
        console.log(`- Input   : ID=1 (Có 5 phòng liên kết)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.deleteBuilding(1);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Xóa tòa nhà với ID bị null', async () => {
        Building.findByPk.mockResolvedValue(null);
        const expectedError = 'Building not found';

        console.log(`[TEST]: Xóa tòa nhà với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.deleteBuilding(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
