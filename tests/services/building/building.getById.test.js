const BuildingService = require('../../../services/building.service');
const Building = require('../../../models/building.model');
const Room = require('../../../models/room.model');
const University = require('../../../models/university.model');

jest.mock('../../../models/building.model');
jest.mock('../../../models/room.model');
jest.mock('../../../models/roomType.model');
jest.mock('../../../models/university.model');
jest.mock('../../../models/user.model');

describe('BuildingService - getBuildingById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy chi tiết tòa nhà thành công', async () => {
        const mockBuilding = { 
            id: 1, 
            name: 'Building A', 
            location_id: 1,
            toJSON: () => ({ id: 1, name: 'Building A', location_id: 1 })
        };
        Building.findByPk.mockResolvedValue(mockBuilding);
        Room.findAll.mockResolvedValue([]);
        University.findAll.mockResolvedValue([]);

        const result = await BuildingService.getBuildingById(1, { role: 'ADMIN' });

        console.log(`[TEST]: Lấy chi tiết tòa nhà`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: Name="Building A"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Building A');
    });

    it('Tòa nhà không tồn tại', async () => {
        Building.findByPk.mockResolvedValue(null);
        const expectedError = 'Building not found';

        console.log(`[TEST]: Tòa nhà không tồn tại`);
        console.log(`- Input   : ID=999`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.getBuildingById(999);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('ID tòa nhà bị null', async () => {
        const expectedError = 'Building not found';

        console.log(`[TEST]: Truy vấn tòa nhà với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await BuildingService.getBuildingById(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
