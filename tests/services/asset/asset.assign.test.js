// 1. Mock Database & Models (Must be before requiring service)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Asset: { findByPk: jest.fn(), update: jest.fn() },
        Room: { findByPk: jest.fn() },
        AssetHistory: { create: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            define: jest.fn().mockReturnValue({
                associate: jest.fn(),
                belongsTo: jest.fn(),
                hasMany: jest.fn()
            }),
            transaction: jest.fn().mockResolvedValue({ 
                commit: jest.fn(), 
                rollback: jest.fn() 
            })
        }
    };
});

// 2. Mock individual models
jest.mock('../../../models/asset.model', () => (require('../../../config/db').sequelize.models.Asset));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/assetHistory.model', () => (require('../../../config/db').sequelize.models.AssetHistory));

const AssetService = require('../../../services/asset.service');
const { Asset, Room } = require('../../../config/db').sequelize.models;
const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

describe('AssetService - assignAsset', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('TC_ASSET_01: Gán Asset vào phòng thành công (CHECK_IN)', async () => {
        const mockAsset = { 
            id: 'a1', 
            building_id: 'b1', 
            current_room_id: null,
            status: 'AVAILABLE',
            update: jest.fn().mockResolvedValue(true)
        };
        // Lần 1: findByPk trả về asset trống
        // Lần 2: findByPk (trong getAssetById) trả về asset đã gán
        Asset.findByPk
            .mockResolvedValueOnce(mockAsset)
            .mockResolvedValueOnce({ ...mockAsset, current_room_id: 'r1', status: 'IN_USE' });
        
        Room.findByPk.mockResolvedValue({ id: 'r1', building_id: 'b1' });
        
        const user = { id: 'u1', role: ROLES.ADMIN };
        const result = await AssetService.assignAsset('a1', { room_id: 'r1' }, user);

        console.log(`[TEST]: Gán Asset vào phòng (Check-in)`);
        console.log(`- Input   : AssetID="a1", RoomID="r1"`);
        console.log(`- Expected: current_room_id="r1", status="IN_USE"`);
        console.log(`- Actual  : RoomID="${result.current_room_id}", Status="${result.status}"`);

        expect(result.status).toBe('IN_USE');
        expect(result.current_room_id).toBe('r1');
    });

    it('TC_ASSET_02: Hoàn trả Asset từ phòng (CHECK_OUT)', async () => {
        const mockAsset = { 
            id: 'a1', 
            building_id: 'b1', 
            current_room_id: 'r1',
            status: 'IN_USE',
            update: jest.fn().mockResolvedValue(true)
        };
        // Lần 1: findByPk trả về asset đang dùng
        // Lần 2: findByPk (trong getAssetById) trả về asset đã trống
        Asset.findByPk
            .mockResolvedValueOnce(mockAsset)
            .mockResolvedValueOnce({ ...mockAsset, current_room_id: null, status: 'AVAILABLE' });
            
        const user = { id: 'u1', role: ROLES.ADMIN };
        const result = await AssetService.assignAsset('a1', { room_id: null }, user);

        console.log(`[TEST]: Hoàn trả Asset (Check-out)`);
        console.log(`- Input   : room_id=null`);
        console.log(`- Expected: current_room_id=null, status="AVAILABLE"`);
        console.log(`- Actual  : Status="${result.status}"`);

        expect(result.status).toBe('AVAILABLE');
        expect(result.current_room_id).toBeNull();
    });

    it('TC_ASSET_03: Chặn gán Asset đang bảo trì', async () => {
        const mockAsset = { id: 'a1', status: 'MAINTENANCE', building_id: 'b1' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        const expectedError = 'Không thể gán tài sản đang bảo trì';

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

    it('TC_ASSET_04: Lỗi khi target room không cùng tòa nhà', async () => {
        const mockAsset = { id: 'a1', building_id: 'b1', status: 'AVAILABLE' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        Room.findByPk.mockResolvedValue({ id: 'r2', building_id: 'b2' }); // Khác b1
        const expectedError = 'Phòng đích không cùng tòa nhà với tài sản';

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
