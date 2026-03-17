const AssetService = require('../../../services/asset.service');
const Asset = require('../../../models/asset.model');
const Request = require('../../../models/request.model');

jest.mock('../../../models/asset.model');
jest.mock('../../../models/request.model');

describe('AssetService - deleteAsset', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Xóa Asset thành công', async () => {
        const mockAsset = { 
            id: 'a1', 
            name: 'Asset X', 
            status: 'AVAILABLE',
            destroy: jest.fn().mockResolvedValue(true) 
        };
        Asset.findByPk.mockResolvedValue(mockAsset);
        Request.findOne.mockResolvedValue(null); // Không có yêu cầu sửa chữa

        const result = await AssetService.deleteAsset('a1');

        console.log(`[TEST]: Xóa Asset thành công`);
        console.log(`- Input   : ID="a1"`);
        console.log(`- Expected: "Asset \"Asset X\" deleted successfully"`);
        console.log(`- Actual  : "${result.message}"`);

        expect(result.message).toContain('deleted successfully');
    });

    it('Chặn xóa Asset đang được sử dụng (IN_USE)', async () => {
        const mockAsset = { id: 'a1', status: 'IN_USE' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        const expectedError = 'Cannot delete asset currently in use. Check out first.';

        console.log(`[TEST]: Chặn xóa Asset IN_USE`);
        console.log(`- Input   : status="IN_USE"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.deleteAsset('a1');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Chặn xóa Asset đang có yêu cầu sửa chữa chưa hoàn tất', async () => {
        const mockAsset = { id: 'a1', status: 'BROKEN' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        Request.findOne.mockResolvedValue({ id: 'req1', status: 'PENDING' });
        const expectedError = 'Cannot delete asset with active maintenance requests';

        console.log(`[TEST]: Chặn xóa Asset có Request active`);
        console.log(`- Input   : Has active Request status="PENDING"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.deleteAsset('a1');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });

    it('ID Asset bị null khi xóa', async () => {
        Asset.findByPk.mockResolvedValue(null);
        const expectedError = 'Asset not found';

        console.log(`[TEST]: Xóa Asset với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.deleteAsset(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
