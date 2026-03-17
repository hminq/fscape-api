const AssetService = require('../../../services/asset.service');
const Asset = require('../../../models/asset.model');
const { ROLES } = require('../../../constants/roles');

jest.mock('../../../models/asset.model');
jest.mock('../../../models/building.model');
jest.mock('../../../models/room.model');
jest.mock('../../../models/assetHistory.model');

describe('AssetService - getAssetById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy chi tiết Asset thành công', async () => {
        const mockAsset = { 
            id: 'a1', 
            name: 'Asset 1', 
            building_id: 'b1',
            toJSON: () => ({ id: 'a1', name: 'Asset 1', building_id: 'b1' })
        };
        Asset.findByPk.mockResolvedValue(mockAsset);

        const result = await AssetService.getAssetById('a1', { role: ROLES.ADMIN });

        console.log(`[TEST]: Lấy chi tiết Asset`);
        console.log(`- Input   : ID="a1"`);
        console.log(`- Expected: Name="Asset 1"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.id).toBe('a1');
    });

    it('Lỗi khi BM truy cập Asset của tòa nhà khác', async () => {
        const mockAsset = { id: 'a1', building_id: 'b2' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        const user = { role: ROLES.BUILDING_MANAGER, building_id: 'b1' };
        const expectedError = 'You can only access assets in your assigned building';

        console.log(`[TEST]: Chặn BM truy cập Asset tòa khác`);
        console.log(`- Input   : UserBuilding="b1", AssetBuilding="b2"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.getAssetById('a1', user);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Asset không tồn tại', async () => {
        Asset.findByPk.mockResolvedValue(null);
        const expectedError = 'Asset not found';

        console.log(`[TEST]: Asset không tồn tại`);
        console.log(`- Input   : ID="999"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.getAssetById('999');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('ID Asset bị null', async () => {
        const expectedError = 'Asset not found';

        console.log(`[TEST]: Truy vấn Asset với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.getAssetById(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
