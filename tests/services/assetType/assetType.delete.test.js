const AssetTypeService = require('../../../services/assetType.service');
const AssetType = require('../../../models/assetType.model');
const Asset = require('../../../models/asset.model');

jest.mock('../../../models/assetType.model');
jest.mock('../../../models/asset.model');

describe('AssetTypeService - deleteAssetType', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Xóa Asset Type thành công (Happy Path)', async () => {
        const mockAssetType = { 
            id: 1, 
            name: 'Bàn', 
            destroy: jest.fn().mockResolvedValue(true) 
        };
        AssetType.findByPk.mockResolvedValue(mockAssetType);
        Asset.count.mockResolvedValue(0);

        const result = await AssetTypeService.deleteAssetType(1);

        console.log(`[TEST]: Xóa Asset Type thành công`);
        console.log(`- Input   : ID=1`);
        console.log(`- Expected: "Đã xóa loại tài sản \"Bàn\" thành công"`);
        console.log(`- Actual  : "${result.message}"`);

        expect(result.message).toContain('thành công');
        expect(mockAssetType.destroy).toHaveBeenCalled();
    });

    it('Lỗi khi xóa loại tài sản không tồn tại (Abnormal)', async () => {
        AssetType.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Xóa loại tài sản không tồn tại`);
        try {
            await AssetTypeService.deleteAssetType(999);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy loại tài sản');
        }
    });

    it('Lỗi khi xóa loại tài sản đang có tài sản sử dụng (Abnormal)', async () => {
        const mockAssetType = { id: 1, name: 'Ghế' };
        AssetType.findByPk.mockResolvedValue(mockAssetType);
        Asset.count.mockResolvedValue(5); // 5 assets using this type

        console.log(`[TEST]: Xóa loại tài sản đang được sử dụng`);
        try {
            await AssetTypeService.deleteAssetType(1);
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toContain('đang có 5 tài sản sử dụng');
        }
    });
});
