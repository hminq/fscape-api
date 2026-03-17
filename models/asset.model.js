const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Asset = sequelize.define('Asset', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    building_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'buildings',
        key: 'id'
      }
    },
    qr_code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "assets_qr_code_key"
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("AVAILABLE","IN_USE","MAINTENANCE"),
      allowNull: true,
      defaultValue: "AVAILABLE"
    },
    current_room_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rooms',
        key: 'id'
      }
    },
    asset_type_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'asset_types',
        key: 'id'
      }
    }
  }, {
    tableName: 'assets',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "assets_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "assets_qr_code_key",
        unique: true,
        fields: [
          { name: "qr_code" },
        ]
      },
      {
        name: "idx_assets_building_id",
        fields: [
          { name: "building_id" },
        ]
      },
      {
        name: "idx_assets_current_room_id",
        fields: [
          { name: "current_room_id" },
        ]
      },
      {
        name: "idx_assets_qr_code",
        fields: [
          { name: "qr_code" },
        ]
      }, {
        name: "idx_assets_asset_type_id",
        fields: [
          { name: "asset_type_id" },
        ]
      }, {
        name: "idx_assets_status",
        fields: [
          { name: "status" },
        ]
      },
    ]
  });

Asset.associate = (models) => {
  Asset.belongsTo(models.Building, { foreignKey: 'building_id', as: 'building' });
  Asset.belongsTo(models.Room, { foreignKey: 'current_room_id', as: 'room' });
  Asset.belongsTo(models.AssetType, { foreignKey: 'asset_type_id', as: 'asset_type' });
  Asset.hasMany(models.AssetHistory, { foreignKey: 'asset_id', as: 'histories' });
};

module.exports = Asset;
