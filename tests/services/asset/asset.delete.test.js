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

    it('TC_ASSET_01: Xóa Asset thành công', async () => {
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
        console.log(`- Expected: "Đã xóa tài sản \"Asset X\" thành công"`);
        console.log(`- Actual  : "${result.message}"`);

        expect(result.message).toContain('thành công');
    });

    it('TC_ASSET_02: Chặn xóa Asset đang được sử dụng (IN_USE)', async () => {
        const mockAsset = { id: 'a1', status: 'IN_USE' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        const expectedError = 'Không thể xóa tài sản đang sử dụng. Vui lòng thu hồi trước.';

        console.log(`[TEST]: Chặn xóa Asset IN_USE`);
        console.log(`- Input   : status="IN_USE"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.deleteAsset('a1');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });

    it('TC_ASSET_03: Chặn xóa Asset đang có yêu cầu sửa chữa chưa hoàn tất', async () => {
        const mockAsset = { id: 'a1', status: 'BROKEN' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        Request.findOne.mockResolvedValue({ id: 'req1', status: 'PENDING' });
        const expectedError = 'Không thể xóa tài sản có yêu cầu bảo trì đang hoạt động';

        console.log(`[TEST]: Chặn xóa Asset có Request active`);
        console.log(`- Input   : Has active Request status="PENDING"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.deleteAsset('a1');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });

    it('TC_ASSET_04: ID Asset bị null khi xóa', async () => {
        Asset.findByPk.mockResolvedValue(null);
        const expectedError = 'Không tìm thấy tài sản';

        console.log(`[TEST]: Xóa Asset với ID=null`);
        console.log(`- Input   : ID=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.deleteAsset(null);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe(expectedError);
        }
    });
});
