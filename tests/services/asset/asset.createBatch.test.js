const AssetService = require('../../../services/asset.service');
const Asset = require('../../../models/asset.model');
const Building = require('../../../models/building.model');
const { sequelize } = require('../../../config/db');

jest.mock('../../../models/asset.model');
jest.mock('../../../models/assetHistory.model');
jest.mock('../../../models/building.model');
jest.mock('../../../models/assetType.model');
jest.mock('../../../config/db', () => ({
    sequelize: {
        transaction: jest.fn(() => ({
            commit: jest.fn(),
            rollback: jest.fn()
        }))
    }
}));

describe('AssetService - createBatchAssets', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('Tạo hàng loạt Asset thành công', async () => {
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

    it('Lỗi khi số lượng vượt quá 100', async () => {
        const batchData = { name: 'Chair', building_id: 'b1', quantity: 150 };
        const expectedError = 'quantity must be between 1 and 100';

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

    it('Lỗi khi thiếu thông tin bắt buộc', async () => {
        const batchData = { quantity: 10 }; // Thiếu name và building_id
        const expectedError = 'name and building_id are required';

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
