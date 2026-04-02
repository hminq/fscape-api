const AssetTypeService = require('../../../services/assetType.service');
const AssetType = require('../../../models/assetType.model');

jest.mock('../../../models/assetType.model');

describe('AssetTypeService - getAssetTypeStats', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy thống kê loại tài sản thành công (Dữ liệu hỗn hợp)', async () => {
        const mockRows = [
            { is_active: true },
            { is_active: true },
            { is_active: false }
        ];
        AssetType.findAll.mockResolvedValue(mockRows);

        const result = await AssetTypeService.getAssetTypeStats();

        console.log(`[TEST]: Lấy thống kê Asset Type`);
        console.log(`- Input   : API Call`);
        console.log(`- Expected: Total=3, Active=2, Inactive=1`);
        console.log(`- Actual  : Total=${result.total}, Active=${result.by_status.active}, Inactive=${result.by_status.inactive}`);

        expect(result.total).toBe(3);
        expect(result.by_status.active).toBe(2);
        expect(result.by_status.inactive).toBe(1);
    });

    it('Lấy thống kê khi cơ sở dữ liệu rỗng (Boundary)', async () => {
        AssetType.findAll.mockResolvedValue([]);

        const result = await AssetTypeService.getAssetTypeStats();

        console.log(`[TEST]: Bảng Asset Type rỗng`);
        console.log(`- Input   : API Call`);
        console.log(`- Expected: Total=0, Active=0, Inactive=0`);
        console.log(`- Actual  : Total=${result.total}, Active=${result.by_status.active}, Inactive=${result.by_status.inactive}`);

        expect(result.total).toBe(0);
        expect(result.by_status.active).toBe(0);
        expect(result.by_status.inactive).toBe(0);
    });
});
