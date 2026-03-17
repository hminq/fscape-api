const AssetTypeService = require('../../../services/assetType.service');
const AssetType = require('../../../models/assetType.model');

jest.mock('../../../models/assetType.model');

describe('AssetTypeService - createAssetType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Tạo Asset Type mới thành công', async () => {
        const newData = { name: 'Máy chiếu', default_price: 5000000 };
        AssetType.findOne.mockResolvedValue(null);
        AssetType.create.mockResolvedValue({ id: 1, ...newData });

        const result = await AssetTypeService.createAssetType(newData);

        console.log(`[TEST]: Tạo Asset Type mới`);
        console.log(`- Input   : Name="${newData.name}"`);
        console.log(`- Expected: Name="Máy chiếu"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Máy chiếu');
    });

    it('Tên Asset Type bị trống', async () => {
        const newData = { name: '' };
        const expectedError = 'Asset type name is required';

        console.log(`[TEST]: Tên Asset Type trống`);
        console.log(`- Input   : Name=""`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.createAssetType(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Tên Asset Type bị null', async () => {
        const newData = { name: null };
        const expectedError = 'Asset type name is required';

        console.log(`[TEST]: Tên Asset Type null`);
        console.log(`- Input   : Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.createAssetType(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Giá mặc định âm', async () => {
        const newData = { name: 'Loa', default_price: -1000 };
        const expectedError = 'default_price must be >= 0';

        console.log(`[TEST]: Giá mặc định âm`);
        console.log(`- Input   : default_price=-1000`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.createAssetType(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Trùng tên Asset Type', async () => {
        const newData = { name: 'Bàn' };
        AssetType.findOne.mockResolvedValue({ id: 10, name: 'Bàn' });
        const expectedError = 'Asset type "Bàn" already exists';

        console.log(`[TEST]: Trùng tên Asset Type`);
        console.log(`- Input   : Name="Bàn"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.createAssetType(newData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
