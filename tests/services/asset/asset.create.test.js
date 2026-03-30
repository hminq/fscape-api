const AssetService = require('../../../services/asset.service');
const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => {
    const mockModels = {
        Asset: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn(), findAll: jest.fn() },
        AssetHistory: { create: jest.fn() },
        Building: { findByPk: jest.fn() },
        Room: { findByPk: jest.fn() },
        AssetType: { findByPk: jest.fn() }
    };
    return {
        sequelize: {
            models: mockModels,
            transaction: jest.fn().mockResolvedValue({ 
                commit: jest.fn(), 
                rollback: jest.fn(),
                LOCK: { UPDATE: 'UPDATE' }
            }),
            authenticate: jest.fn().mockResolvedValue(),
            close: jest.fn().mockResolvedValue()
        },
        connectDB: jest.fn().mockResolvedValue()
    };
});

// Mock individual models
jest.mock('../../../models/asset.model', () => (require('../../../config/db').sequelize.models.Asset));
jest.mock('../../../models/assetHistory.model', () => (require('../../../config/db').sequelize.models.AssetHistory));
jest.mock('../../../models/building.model', () => (require('../../../config/db').sequelize.models.Building));
jest.mock('../../../models/room.model', () => (require('../../../config/db').sequelize.models.Room));
jest.mock('../../../models/assetType.model', () => (require('../../../config/db').sequelize.models.AssetType));

const { Asset, Building, Room } = sequelize.models;

describe('AssetService - createAsset', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    it('TC_ASSET_01: Tạo Asset mới thành công (Happy Path)', async () => {
        const newData = { name: 'Monitor', building_id: 'b1' };
        Building.findByPk.mockResolvedValue({ id: 'b1' });
        
        const mockCreatedAsset = { 
            id: 'a1', 
            ...newData,
            toJSON: () => ({ id: 'a1', ...newData })
        };
        Asset.create.mockResolvedValue(mockCreatedAsset);
        
        // Mock findByPk for getAssetById inside createAsset
        Asset.findByPk.mockResolvedValue(mockCreatedAsset);

        const result = await AssetService.createAsset(newData);

        console.log(`[TEST]: Tạo Asset mới`);
        console.log(`- Input   : Name="${newData.name}", BuildingID="${newData.building_id}"`);
        console.log(`- Expected: Object Asset id="a1"`);
        console.log(`- Actual  : Asset ID="${result.id}"`);

        expect(result.id).toBe('a1');
        expect(Asset.create).toHaveBeenCalled();
    });

    it('TC_ASSET_02: Lỗi khi tòa nhà không tồn tại (Abnormal)', async () => {
        Building.findByPk.mockResolvedValue(null);
        console.log(`[TEST]: Tạo Asset với tòa nhà không tồn tại`);
        try {
            await AssetService.createAsset({ name: 'Test', building_id: '999' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy tòa nhà');
        }
    });

    it('TC_ASSET_03: Lỗi khi phòng không thuộc tòa nhà đã chọn (Abnormal)', async () => {
        Building.findByPk.mockResolvedValue({ id: 'b1' });
        Room.findByPk.mockResolvedValue({ id: 'r1', building_id: 'b2' }); 

        console.log(`[TEST]: Tạo Asset với phòng không khớp tòa nhà`);
        try {
            await AssetService.createAsset({ name: 'Test', building_id: 'b1', current_room_id: 'r1' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(400);
            expect(error.message).toBe('Phòng không thuộc tòa nhà được chỉ định');
        }
    });

    it('TC_ASSET_04: Lỗi khi không tìm thấy phòng đích (Abnormal)', async () => {
        Building.findByPk.mockResolvedValue({ id: 'b1' });
        Room.findByPk.mockResolvedValue(null);

        console.log(`[TEST]: Tạo Asset gắn vào phòng không tồn tại`);
        try {
            await AssetService.createAsset({ name: 'Test', building_id: 'b1', current_room_id: 'r999' });
            throw new Error('Should have thrown error');
        } catch (error) {
            console.log(`- Actual Error  : "${error.message}"`);
            expect(error.status).toBe(404);
            expect(error.message).toBe('Không tìm thấy phòng');
        }
    });
});
