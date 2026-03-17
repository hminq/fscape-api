const AssetService = require('../../../services/asset.service');
const Asset = require('../../../models/asset.model');
const { ROLES } = require('../../../constants/roles');

jest.mock('../../../models/asset.model');
jest.mock('../../../models/building.model');
jest.mock('../../../models/room.model');

describe('AssetService - getAllAssets', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Lấy danh sách Asset thành công (Admin)', async () => {
        const mockRows = [{ id: 1, name: 'Asset 1', status: 'AVAILABLE', toJSON: () => ({ id: 1, name: 'Asset 1' }) }];
        Asset.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const query = { page: 1, limit: 10 };
        const result = await AssetService.getAllAssets(query, { role: ROLES.ADMIN });

        console.log(`[TEST]: Lấy danh sách Asset (Admin)`);
        console.log(`- Input   : Query=${JSON.stringify(query)}, Role="ADMIN"`);
        console.log(`- Expected: Total=1, page=1`);
        console.log(`- Actual  : Total=${result.total}, page=${result.page}`);

        expect(result.total).toBe(1);
        expect(result.data).toEqual(mockRows);
    });

    it('Lấy danh sách Asset (BM/Staff) - Bị giới hạn theo tòa nhà', async () => {
        const mockRows = [{ id: 1, name: 'Asset B', building_id: 'b1', toJSON: () => ({ id: 1, name: 'Asset B' }) }];
        Asset.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

        const user = { role: ROLES.BUILDING_MANAGER, building_id: 'b1' };
        const result = await AssetService.getAllAssets({}, user);

        console.log(`[TEST]: Lấy danh sách Asset (BM)`);
        console.log(`- Input   : UserRole="BUILDING_MANAGER", BuildingID="b1"`);
        console.log(`- Expected: Giới hạn tìm kiếm trong tòa nhà b1`);
        console.log(`- Actual  : Asset in Building=${result.data[0].id}`);

        expect(Asset.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ building_id: 'b1' })
        }));
    });

    it('Tìm kiếm Asset theo tên hoặc mã QR', async () => {
        Asset.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

        const query = { search: 'ABC' };
        await AssetService.getAllAssets(query, { role: ROLES.ADMIN });

        console.log(`[TEST]: Tìm kiếm Asset`);
        console.log(`- Input   : Search="ABC"`);
        console.log(`- Expected: Tìm theo Name hoặc QR_Code`);
        
        expect(Asset.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                [expect.any(Symbol)]: expect.arrayContaining([
                    { name: { [expect.any(Symbol)]: '%ABC%' } },
                    { qr_code: { [expect.any(Symbol)]: '%ABC%' } }
                ])
            })
        }));
    });
});
