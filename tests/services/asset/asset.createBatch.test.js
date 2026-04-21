// 1. Mock Database & Models (Must be before requiring service)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Asset: { create: jest.fn() },
        Building: { findByPk: jest.fn() },
        AssetType: { findByPk: jest.fn() },
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
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));

const AssetService = require('../../../services/asset.service');
const { Asset, Building } = require('../../../config/db').sequelize.models;
const { sequelize } = require('../../../config/db');

describe('AssetService - createBatchAssets', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('TC_ASSET_01: Tạo hàng loạt Asset thành công', async () => {
        const batchData = { 
            name: 'Table', 
            building_id: 'b1', 
            quantity: 5 
        };
        Building.findByPk.mockResolvedValue({ id: 'b1' });
        Asset.create.mockResolvedValue({ id: 'new-id' });

        const result = await AssetService.createBatchAssets(batchData);

        console.log(`[TEST]: Tạo hàng loạt Asset`);
        console.log(`- Input   : Name="Table", Quantity=5`);
        console.log(`- Expected: count=5`);
        console.log(`- Actual  : count=${result.count}`);

        expect(result.count).toBe(5);
        expect(Asset.create).toHaveBeenCalledTimes(5);
    });

    it('TC_ASSET_02: Lỗi khi số lượng vượt quá 100', async () => {
        const batchData = { name: 'Chair', building_id: 'b1', quantity: 150 };
        const expectedError = 'Số lượng phải từ 1 đến 100';

        console.log(`[TEST]: Lỗi vượt quá số lượng batch tối đa`);
        console.log(`- Input   : quantity=150`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.createBatchAssets(batchData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe(expectedError);
        }
    });

    it('TC_ASSET_03: Lỗi khi thiếu thông tin bắt buộc', async () => {
        const batchData = { quantity: 10 }; // Thiếu name và building_id
        const expectedError = 'Tên và mã tòa nhà là bắt buộc';

        console.log(`[TEST]: Thiếu thông tin bắt buộc khi tạo batch`);
        console.log(`- Input   : name=undefined, building_id=undefined`);
        console.log(`- Expected Error: "${expectedError}"`);

        try {
            await AssetService.createBatchAssets(batchData);
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.message).toBe(expectedError);
        }
    });
});
