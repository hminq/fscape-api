const AssetTypeService = require('../../../services/assetType.service');
const AssetType = require('../../../models/assetType.model');
const { ROLES } = require('../../../constants/roles');

jest.mock('../../../models/assetType.model');

describe('AssetTypeService - getAssetTypeById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy chi tiết Asset Type thành công (Admin)', async () => {
        const mockAssetType = { id: 1, name: 'Bàn', toJSON: () => ({ id: 1, name: 'Bàn' }) };
        AssetType.findByPk.mockResolvedValue(mockAssetType);

        const result = await AssetTypeService.getAssetTypeById(1, { role: ROLES.ADMIN });

        console.log(`[TEST]: Lấy chi tiết Asset Type`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: Bàn`);
        console.log(`- Actual  : ${result.name}`);

        expect(result.name).toBe('Bàn');
    });

    it('Asset Type không tồn tại', async () => {
        AssetType.findByPk.mockResolvedValue(null);
        const expectedError = 'Asset type not found';

        console.log(`[TEST]: Asset Type không tồn tại`);
        console.log(`- Input   : ID=999`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.getAssetTypeById(999);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('ID bị null', async () => {
        const expectedError = 'Asset type not found';

        console.log(`[TEST]: Truy vấn Asset Type với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.getAssetTypeById(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
