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

    it('TC_ASSET_01: Lấy chi tiết Asset thành công', async () => {
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

    it('TC_ASSET_02: Lỗi khi BM truy cập Asset của tòa nhà khác', async () => {
        const mockAsset = { id: 'a1', building_id: 'b2' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        const user = { role: ROLES.BUILDING_MANAGER, building_id: 'b1' };
        const expectedError = 'Bạn chỉ có thể truy cập tài sản trong tòa nhà được phân công';

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

    it('TC_ASSET_03: Asset không tồn tại', async () => {
        Asset.findByPk.mockResolvedValue(null);
        const expectedError = 'Không tìm thấy tài sản';

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

    it('TC_ASSET_04: ID Asset bị null', async () => {
        const expectedError = 'Không tìm thấy tài sản';

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
