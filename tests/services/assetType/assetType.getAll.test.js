const AssetTypeService = require('../../../services/assetType.service');
const AssetType = require('../../../models/assetType.model');
const { ROLES } = require('../../../constants/roles');

jest.mock('../../../models/assetType.model');

describe('AssetTypeService - getAllAssetTypes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy danh sách Asset Type thành công (Admin)', async () => {
        const mockRows = [{ id: 1, name: 'Bàn', is_active: true, toJSON: () => ({ id: 1, name: 'Bàn' }) }];
        AssetType.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });
        AssetType.count.mockResolvedValue(1);

        const query = { page: 1, limit: 10 };
        const result = await AssetTypeService.getAllAssetTypes(query, { role: ROLES.ADMIN });

        console.log(`[TEST]: Lấy danh sách Asset Type (Admin)`);
        console.log(`- Input   : Query=${JSON.stringify(query)}, Role="ADMIN"`);
        console.log(`- Expected: Total=1, page=1`);
        console.log(`- Actual  : Total=${result.total}, page=${result.page}`);

        expect(result.total).toBe(1);
        expect(result.data).toEqual(mockRows);
    });

    it('Tìm kiếm Asset Type theo tên', async () => {
        const mockRows = [{ id: 2, name: 'Ghế' }];
        AssetType.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });
        AssetType.count.mockResolvedValue(1);

        const query = { search: 'Ghế' };
        const result = await AssetTypeService.getAllAssetTypes(query, { role: ROLES.ADMIN });

        console.log(`[TEST]: Tìm kiếm Asset Type`);
        console.log(`- Input   : Search="Ghế"`);
        console.log(`- Expected: Ghế`);
        console.log(`- Actual  : ${result.data[0].name}`);

        expect(result.data[0].name).toBe('Ghế');
    });

    it('Lấy danh sách Asset Type với Role không phải Admin (Bị xóa timestamps)', async () => {
        const mockRows = [{
            toJSON: () => ({ id: 3, name: 'Bảng', created_at: 'yesterday', updated_at: 'today' })
        }];
        AssetType.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });
        AssetType.count.mockResolvedValue(1);

        const query = { page: 1, limit: 10 };
        const result = await AssetTypeService.getAllAssetTypes(query, { role: 'STAFF' });

        console.log(`[TEST]: Lấy ds Asset Type (STAFF)`);
        console.log(`- Expected: Không chứa created_at/updated_at`);
        console.log(`- Actual Keys: ${Object.keys(result.data[0]).join(', ')}`);

        expect(result.data[0].id).toBe(3);
        expect(result.data[0].created_at).toBeUndefined();
        expect(result.data[0].updated_at).toBeUndefined();
    });

    it('Gặp lỗi Database Exception khi truyền query ngẫu nhiên sập DB (Abnormal)', async () => {
        const query = { page: -1, limit: 10 };
        const expectedError = 'SQL Error: OFFSET must not be negative';
        AssetType.findAndCountAll.mockRejectedValue(new Error(expectedError));

        console.log(`[TEST]: Truyền trang bị âm`);
        console.log(`- Input   : ${JSON.stringify(query)}`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetTypeService.getAllAssetTypes(query, { role: ROLES.ADMIN });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
