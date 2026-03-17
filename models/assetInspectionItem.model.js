const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AssetInspectionItem = sequelize.define('AssetInspectionItem', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  inspection_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'asset_inspections',
      key: 'id'
    }
  },
  asset_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'assets',
      key: 'id'
    }
  },
  qr_code: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  condition: {
    type: DataTypes.ENUM('GOOD', 'BROKEN'),
    allowNull: false
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'asset_inspection_items',
  schema: 'public',
  timestamps: true,
  updatedAt: false,
  underscored: true,
  indexes: [
    {
      name: 'idx_asset_inspection_items_inspection_id',
      fields: [{ name: 'inspection_id' }]
    },
    {
      name: 'idx_asset_inspection_items_asset_id',
      fields: [{ name: 'asset_id' }]
    },
    {
      name: 'uq_inspection_asset',
      unique: true,
      fields: [{ name: 'inspection_id' }, { name: 'asset_id' }]
    }
  ]
});

AssetInspectionItem.associate = (models) => {
  AssetInspectionItem.belongsTo(models.AssetInspection, { foreignKey: 'inspection_id', as: 'inspection' });
  AssetInspectionItem.belongsTo(models.Asset, { foreignKey: 'asset_id', as: 'asset' });
};

module.exports = AssetInspectionItem;
