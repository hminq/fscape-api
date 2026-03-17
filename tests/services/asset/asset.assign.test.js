const AssetService = require('../../../services/asset.service');
const Asset = require('../../../models/asset.model');
const Room = require('../../../models/room.model');
const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

jest.mock('../../../models/asset.model');
jest.mock('../../../models/assetHistory.model');
jest.mock('../../../models/room.model');
jest.mock('../../../config/db', () => ({
    sequelize: {
        transaction: jest.fn(() => ({
            commit: jest.fn(),
            rollback: jest.fn()
        }))
    }
}));

describe('AssetService - assignAsset', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Gán Asset vào phòng thành công (CHECK_IN)', async () => {
        const mockAsset = { 
            id: 'a1', 
            building_id: 'b1', 
            current_room_id: null,
            status: 'AVAILABLE',
            update: jest.fn().mockResolvedValue(true)
        };
        Asset.findByPk.mockResolvedValue(mockAsset);
        Room.findByPk.mockResolvedValue({ id: 'r1', building_id: 'b1' });
        
        const user = { id: 'u1', role: ROLES.ADMIN };
        jest.spyOn(AssetService, 'getAssetById').mockResolvedValue({ id: 'a1', current_room_id: 'r1', status: 'IN_USE' });

        const result = await AssetService.assignAsset('a1', { room_id: 'r1' }, user);

        console.log(`[TEST]: Gán Asset vào phòng (Check-in)`);
        console.log(`- Input   : AssetID="a1", RoomID="r1"`);
        console.log(`- Expected: current_room_id="r1", status="IN_USE"`);
        console.log(`- Actual  : RoomID="${result.current_room_id}", Status="${result.status}"`);

        expect(result.status).toBe('IN_USE');
    });

    it('Hoàn trả Asset từ phòng (CHECK_OUT)', async () => {
        const mockAsset = { 
            id: 'a1', 
            building_id: 'b1', 
            current_room_id: 'r1',
            status: 'IN_USE',
            update: jest.fn().mockResolvedValue(true)
        };
        Asset.findByPk.mockResolvedValue(mockAsset);
        
        const user = { id: 'u1', role: ROLES.ADMIN };
        jest.spyOn(AssetService, 'getAssetById').mockResolvedValue({ id: 'a1', current_room_id: null, status: 'AVAILABLE' });

        const result = await AssetService.assignAsset('a1', { room_id: null }, user);

        console.log(`[TEST]: Hoàn trả Asset (Check-out)`);
        console.log(`- Input   : room_id=null`);
        console.log(`- Expected: current_room_id=null, status="AVAILABLE"`);
        console.log(`- Actual  : Status="${result.status}"`);

        expect(result.status).toBe('AVAILABLE');
        expect(result.current_room_id).toBeNull();
    });

    it('Chặn gán Asset đang bảo trì', async () => {
        const mockAsset = { id: 'a1', status: 'MAINTENANCE', building_id: 'b1' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        const expectedError = 'Cannot assign asset under maintenance';

        console.log(`[TEST]: Chặn gán Asset MAINTENANCE`);
        console.log(`- Input   : status="MAINTENANCE"`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.assignAsset('a1', { room_id: 'r1' }, { role: ROLES.ADMIN });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(409);
            expect(error.message).toBe(expectedError);
        }
    });

    it('Lỗi khi target room không cùng tòa nhà', async () => {
        const mockAsset = { id: 'a1', building_id: 'b1', status: 'AVAILABLE' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        Room.findByPk.mockResolvedValue({ id: 'r2', building_id: 'b2' }); // Khác b1
        const expectedError = 'Target room is not in the same building as the asset';

        console.log(`[TEST]: Gán phòng sai tòa nhà`);
        console.log(`- Input   : AssetBuilding="b1", TargetRoom="r2" (thuộc b2)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.assignAsset('a1', { room_id: 'r2' }, { role: ROLES.ADMIN });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
