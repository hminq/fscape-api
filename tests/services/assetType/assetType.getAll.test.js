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
});
