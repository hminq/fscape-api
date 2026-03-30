const AssetTypeService = require('../../../services/assetType.service');
const AssetType = require('../../../models/assetType.model');

jest.mock('../../../models/assetType.model');

describe('AssetTypeService - updateAssetType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Cập nhật Asset Type thành công (Happy Path)', async () => {
        const mockAssetType = { 
            id: 1, 
            name: 'Bàn', 
            update: jest.fn().mockImplementation(function(data) {
                Object.assign(this, data);
                return Promise.resolve(true);
            })
        };
        AssetType.findByPk.mockResolvedValue(mockAssetType);
        AssetType.findOne.mockResolvedValue(null);

        const updateData = { name: 'Bàn Gỗ', default_price: 600000 };
        const result = await AssetTypeService.updateAssetType(1, updateData);

        console.log(`[TEST]: Cập nhật Asset Type`);
        console.log(`- Input   : ID=1, NewName="${updateData.name}"`);
        console.log(`- Expected: Bàn Gỗ`);
        console.log(`- Actual  : ${result.name}`);

        expect(result.name).toBe('Bàn Gỗ');
        expect(mockAssetType.update).toHaveBeenCalledWith(updateData);
    });

    it('Lỗi cập nhật trùng tên với loại tài sản khác (Abnormal)', async () => {
        const mockAssetType = { id: 1, name: 'Bàn' };
        AssetType.findByPk.mockResolvedValue(mockAssetType);
        AssetType.findOne.mockResolvedValue({ id: 2, name: 'Ghế' });

        console.log(`[TEST]: Cập nhật trùng tên Asset Type khác`);
        try {
            await AssetTypeService.updateAssetType(1, { name: 'Ghế' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toContain('đã tồn tại');
        }
    });

    it('Lỗi cập nhật giá mặc định âm (Abnormal)', async () => {
        const mockAssetType = { id: 1, name: 'Bàn' };
        AssetType.findByPk.mockResolvedValue(mockAssetType);

        console.log(`[TEST]: Cập nhật giá mặc định âm`);
        try {
            await AssetTypeService.updateAssetType(1, { default_price: -500 });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Giá mặc định phải từ 0 trở lên');
        }
    });

    it('Lỗi cập nhật loại tài sản không tồn tại (Abnormal)', async () => {
        AssetType.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Cập nhật Asset Type không tồn tại`);
        try {
            await AssetTypeService.updateAssetType(999, { name: 'New' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy loại tài sản');
        }
    });
});
