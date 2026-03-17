const AssetService = require('../../../services/asset.service');
const Asset = require('../../../models/asset.model');
const Building = require('../../../models/building.model');
const Room = require('../../../models/room.model');
const { sequelize } = require('../../../config/db');

jest.mock('../../../models/asset.model');
jest.mock('../../../models/assetHistory.model');
jest.mock('../../../models/building.model');
jest.mock('../../../models/room.model');
jest.mock('../../../config/db', () => ({
    sequelize: {
        transaction: jest.fn(() => ({
            commit: jest.fn(),
            rollback: jest.fn()
        }))
    }
}));

describe('AssetService - createAsset', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Tạo Asset mới thành công', async () => {
        const newData = { name: 'Monitor', building_id: 'b1' };
        Building.findByPk.mockResolvedValue({ id: 'b1' });
        Asset.create.mockResolvedValue({ id: 'a1', ...newData });
        
        // Mock getAssetById
        jest.spyOn(AssetService, 'getAssetById').mockResolvedValue({ id: 'a1', ...newData });

        const result = await AssetService.createAsset(newData);

        console.log(`[TEST]: Tạo Asset mới`);
        console.log(`- Input   : Name="${newData.name}", BuildingID="${newData.building_id}"`);
        console.log(`- Expected: Object Asset id="a1"`);
        console.log(`- Actual  : Asset ID="${result.id}"`);

        expect(result.id).toBe('a1');
    });

    it('Lỗi khi tòa nhà không tồn tại', async () => {
        Building.findByPk.mockResolvedValue(null);
        const expectedError = 'Building not found';

        console.log(`[TEST]: Tạo Asset với tòa nhà không tồn tại`);
        console.log(`- Input   : BuildingID="999"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.createAsset({ name: 'Test', building_id: '999' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Lỗi khi phòng không thuộc tòa nhà đã chọn', async () => {
        Building.findByPk.mockResolvedValue({ id: 'b1' });
        Room.findByPk.mockResolvedValue({ id: 'r1', building_id: 'b2' }); // Khác b1
        const expectedError = 'Room does not belong to the specified building';

        console.log(`[TEST]: Tạo Asset với phòng không khớp tòa nhà`);
        console.log(`- Input   : Building="b1", Room="r1" (thuộc b2)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.createAsset({ name: 'Test', building_id: 'b1', current_room_id: 'r1' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Tên Asset bị null', async () => {
        Building.findByPk.mockResolvedValue({ id: 'b1' });
        Asset.create.mockRejectedValue(new Error('name cannot be null'));
        const expectedError = 'name cannot be null';

        console.log(`[TEST]: Tạo Asset với tên bị null`);
        console.log(`- Input   : Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.createAsset({ name: null, building_id: 'b1' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
