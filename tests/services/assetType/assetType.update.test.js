const AssetTypeService = require('../../../services/assetType.service');
const AssetType = require('../../../models/assetType.model');

jest.mock('../../../models/assetType.model');

describe('AssetTypeService - updateAssetType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Cập nhật Asset Type thành công', async () => {
        const mockAssetType = { 
            id: 1, 
            name: 'Bàn', 
            update: jest.fn().mockResolvedValue(true) 
        };
        AssetType.findByPk.mockResolvedValue(mockAssetType);
        AssetType.findOne.mockResolvedValue(null);

        const updateData = { name: 'Bàn Gỗ' };
        const result = await AssetTypeService.updateAssetType(1, updateData);

        console.log(`[TEST]: Cập nhật Asset Type`);
        console.log(`- Input   : ID=1, NewName="${updateData.name}"`);
        console.log(`- Expected: Bàn Gỗ`);
        console.log(`- Actual  : ${result.name}`);

        expect(result.name).toBe('Bàn Gỗ');
    });

    it('Cập nhật trùng tên với loại khác', async () => {
        const mockAssetType = { id: 1, name: 'Bàn' };
        AssetType.findByPk.mockResolvedValue(mockAssetType);
        AssetType.findOne.mockResolvedValue({ id: 2, name: 'Ghế' });
        const expectedError = 'Asset type "Ghế" already exists';

        console.log(`[TEST]: Cập nhật trùng tên Asset Type khác`);
        console.log(`- Input   : ID=1, Name="Ghế" (Đã tồn tại ở ID 2)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.updateAssetType(1, { name: 'Ghế' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật giá âm', async () => {
        const mockAssetType = { id: 1, name: 'Bàn' };
        AssetType.findByPk.mockResolvedValue(mockAssetType);
        const expectedError = 'default_price must be >= 0';

        console.log(`[TEST]: Cập nhật giá mặc định âm`);
        console.log(`- Input   : default_price=-500`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.updateAssetType(1, { default_price: -500 });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Cập nhật Asset Type ID bị null', async () => {
        AssetType.findByPk.mockResolvedValue(null);
        const expectedError = 'Asset type not found';

        console.log(`[TEST]: Cập nhật Asset Type với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.updateAssetType(null, { name: 'New' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
