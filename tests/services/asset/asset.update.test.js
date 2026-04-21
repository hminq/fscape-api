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

describe('AssetService - updateAsset', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('TC_ASSET_01: Cập nhật Asset thành công', async () => {
        const mockAsset = { 
            id: 'a1', 
            building_id: 'b1', 
            status: 'AVAILABLE',
            update: jest.fn().mockResolvedValue(true) 
        };
        // Lần 1: findByPk để lấy asset gốc
        // Lần 2: findByPk (trong getAssetById) để lấy asset sau cập nhật
        Asset.findByPk
            .mockResolvedValueOnce(mockAsset)
            .mockResolvedValueOnce({ ...mockAsset, name: 'Updated Name' });
        
        const updateData = { name: 'Updated Name' };
        const result = await AssetService.updateAsset('a1', updateData);

        console.log(`[TEST]: Cập nhật Asset`);
        console.log(`- Input   : ID="a1", NewName="${updateData.name}"`);
        console.log(`- Expected: Name="Updated Name"`);
        console.log(`- Actual  : Name="${result.name}"`);

        expect(result.name).toBe('Updated Name');
    });

    it('TC_ASSET_02: Lỗi khi chuyển Asset sang phòng của tòa nhà khác', async () => {
        const mockAsset = { id: 'a1', building_id: 'b1', current_room_id: 'r_old' };
        Asset.findByPk.mockResolvedValue(mockAsset);
        Room.findByPk.mockResolvedValue({ id: 'r_new', building_id: 'b2' }); // Khác b1

        const expectedError = 'Phòng không thuộc tòa nhà của tài sản';

        console.log(`[TEST]: Cập nhật phòng không khớp tòa nhà`);
        console.log(`- Input   : AssetBuilding="b1", NewRoom="r_new" (thuộc b2)`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.updateAsset('a1', { current_room_id: 'r_new' });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('TC_ASSET_03: Cập nhật tên Asset thành null', async () => {
        const mockAsset = { 
            id: 'a1', 
            update: jest.fn().mockRejectedValue(new Error('Tên không được bỏ trống')) 
        };
        Asset.findByPk.mockResolvedValue(mockAsset);
        const expectedError = 'Tên không được bỏ trống';

        console.log(`[TEST]: Cập nhật tên Asset thành null`);
        console.log(`- Input   : ID="a1", Name=null`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.updateAsset('a1', { name: null });
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
