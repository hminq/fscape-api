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
        console.log(`[TEST]: Tên Asset Type trống`);
        try {
            await AssetTypeService.createAssetType(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe('Tên loại tài sản là bắt buộc');
            expect(error.status).toBe(400);
        }
    });

    it('Tên Asset Type bị null', async () => {
        const newData = { name: null };
        console.log(`[TEST]: Tên Asset Type null`);
        try {
            await AssetTypeService.createAssetType(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe('Tên loại tài sản là bắt buộc');
            expect(error.status).toBe(400);
        }
    });

    it('Giá mặc định âm', async () => {
        const newData = { name: 'Loa', default_price: -1000 };
        AssetType.findOne.mockResolvedValue(null);
        console.log(`[TEST]: Giá mặc định âm`);
        try {
            await AssetTypeService.createAssetType(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe('Giá mặc định phải từ 0 trở lên');
            expect(error.status).toBe(400);
        }
    });

    it('Trùng tên Asset Type', async () => {
        const newData = { name: 'Bàn' };
        AssetType.findOne.mockResolvedValue({ id: 10, name: 'Bàn' });
        console.log(`[TEST]: Trùng tên Asset Type`);
        try {
            await AssetTypeService.createAssetType(newData);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error: "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toContain('đã tồn tại');
        }
    });

    it('Giá mặc định bằng 0 (Boundary Success)', async () => {
        const newData = { name: 'Đèn', default_price: 0 };
        AssetType.findOne.mockResolvedValue(null);
        AssetType.create.mockResolvedValue({ id: 6, ...newData });

        const result = await AssetTypeService.createAssetType(newData);
        expect(result.default_price).toBe(0);
        console.log(`[TEST]: Giá mặc định bằng 0 (Success)`);
    });

    it('Tên dài tối đa 255 ký tự (Boundary Success)', async () => {
        const longName = 'A'.repeat(255);
        const newData = { name: longName };
        AssetType.findOne.mockResolvedValue(null);
        AssetType.create.mockResolvedValue({ id: 7, ...newData });

        const result = await AssetTypeService.createAssetType(newData);
        expect(result.name.length).toBe(255);
        console.log(`[TEST]: Tên dài 255 ký tự (Success)`);
    });
});
