const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RoomTypeAsset = sequelize.define('RoomTypeAsset', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  room_type_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'room_types',
      key: 'id'
    }
  },
  asset_type_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'asset_types',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.SMALLINT,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'room_type_assets',
  schema: 'public',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      name: "room_type_assets_unique",
      unique: true,
      fields: [{ name: "room_type_id" }, { name: "asset_type_id" }]
    },
    {
      name: "idx_room_type_assets_room_type_id",
      fields: [{ name: "room_type_id" }]
    },
    {
      name: "idx_room_type_assets_asset_type_id",
      fields: [{ name: "asset_type_id" }]
    }
  ]
});

RoomTypeAsset.associate = (models) => {
  RoomTypeAsset.belongsTo(models.RoomType, { foreignKey: 'room_type_id', as: 'room_type' });
  RoomTypeAsset.belongsTo(models.AssetType, { foreignKey: 'asset_type_id', as: 'asset_type' });
};

module.exports = RoomTypeAsset;
