const AssetService = require('../../../services/asset.service');
const Asset = require('../../../models/asset.model');
const Room = require('../../../models/room.model');
const { sequelize } = require('../../../config/db');

jest.mock('../../../models/asset.model');
jest.mock('../../../models/assetHistory.model');
jest.mock('../../../models/room.model');
jest.mock('../../../config/db', () => ({
    sequelize: {
        transaction: jest.fn(() => ({
            commit: jest.fn(),
            rollback: jest.fn()
        }))
    }
}));

describe('AssetService - updateAsset', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Cập nhật Asset thành công', async () => {
        const mockAsset = { 
            id: 'a1', 
            building_id: 'b1', 
            status: 'AVAILABLE',
            update: jest.fn().mockResolvedValue(true) 
        };
        Asset.findByPk.mockResolvedValue(mockAsset);
        
        jest.spyOn(AssetService, 'getAssetById').mockResolvedValue({ id: 'a1', name: 'Updated Name' });

        const updateData = { name: 'Updated Name' };
        const result = await AssetService.updateAsset('a1', updateData);

        console.log(`[TEST]: Cập nhật Asset`);
        console.log(`- Input   : ID="a1", NewName="${updateData.name}"`);
        console.log(`- Expected: Name="Updated Name"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Updated Name');
    });

    it('Lỗi khi chuyển Asset sang phòng của tòa nhà khác', async () => {
        const mockAsset = { id: 'a1', building_id: 'b1', current_room_id: 'r_old' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        Room.findByPk.mockResolvedValue({ id: 'r_new', building_id: 'b2' }); // Khác b1

        const expectedError = 'Room does not belong to the asset\'s building';

        console.log(`[TEST]: Cập nhật phòng không khớp tòa nhà`);
        console.log(`- Input   : AssetBuilding="b1", NewRoom="r_new" (thuộc b2)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.updateAsset('a1', { current_room_id: 'r_new' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật tên Asset thành null', async () => {
        const mockAsset = { 
            id: 'a1', 
            update: jest.fn().mockRejectedValue(new Error('name cannot be null')) 
        };
        Asset.findByPk.mockResolvedValue(mockAsset);
        const expectedError = 'name cannot be null';

        console.log(`[TEST]: Cập nhật tên Asset thành null`);
        console.log(`- Input   : ID="a1", Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.updateAsset('a1', { name: null });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
