const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AssetType = sequelize.define('AssetType', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  default_price: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'asset_types',
  schema: 'public',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: "idx_asset_types_name",
      unique: true,
      fields: [{ name: "name" }]
    },
    {
      name: "idx_asset_types_is_active",
      fields: [{ name: "is_active" }]
    }
  ]
});

AssetType.associate = (models) => {
  AssetType.hasMany(models.Asset, { foreignKey: 'asset_type_id', as: 'assets' });
  AssetType.hasMany(models.RoomTypeAsset, { foreignKey: 'asset_type_id', as: 'room_type_assets' });
};

module.exports = AssetType;
