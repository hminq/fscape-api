const AssetTypeService = require('../../../services/assetType.service');
const AssetType = require('../../../models/assetType.model');

jest.mock('../../../models/assetType.model');

describe('AssetTypeService - deleteAssetType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Vô hiệu hóa Asset Type thành công', async () => {
        const mockAssetType = { 
            id: 1, 
            name: 'Bàn', 
            update: jest.fn().mockResolvedValue(true) 
        };
        AssetType.findByPk.mockResolvedValue(mockAssetType);

        const result = await AssetTypeService.deleteAssetType(1);

        console.log(`[TEST]: Vô hiệu hóa Asset Type`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: "Asset type \"Bàn\" has been deactivated"`);
        console.log(`- Actual  : "${result.message}"`);

        expect(result.message).toContain('has been deactivated');
        expect(mockAssetType.update).toHaveBeenCalledWith({ is_active: false });
    });

    it('Vô hiệu hóa Asset Type ID bị null', async () => {
        AssetType.findByPk.mockResolvedValue(null);
        const expectedError = 'Asset type not found';

        console.log(`[TEST]: Vô hiệu hóa Asset Type với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.deleteAssetType(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Vô hiệu hóa Asset Type không tồn tại', async () => {
        AssetType.findByPk.mockResolvedValue(null);
        const expectedError = 'Asset type not found';

        console.log(`[TEST]: Vô hiệu hóa Asset Type không tồn tại`);
        console.log(`- Input   : ID=888`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.deleteAssetType(888);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
