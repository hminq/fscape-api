const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Asset = require('./asset.model');
const User = require('./user.model');

const AssetHistory = sequelize.define('AssetHistory', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    asset_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'assets',
        key: 'id'
      }
    },
    from_room_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rooms',
        key: 'id'
      }
    },
    to_room_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rooms',
        key: 'id'
      }
    },
    from_status: {
      type: DataTypes.ENUM("AVAILABLE","IN_USE","MAINTENANCE"),
      allowNull: true
    },
    to_status: {
      type: DataTypes.ENUM("AVAILABLE","IN_USE","MAINTENANCE"),
      allowNull: true
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    performed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'asset_history',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "asset_history_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_asset_history_asset_id",
        fields: [
          { name: "asset_id" },
        ]
      }, {
        name: "idx_asset_history_created_at",
        fields: [
          { name: "created_at" },
        ]
      },
    ]
  });

AssetHistory.associate = (models) => {
  AssetHistory.belongsTo(models.Asset, { foreignKey: 'asset_id', as: 'asset' });
  AssetHistory.belongsTo(models.User, { foreignKey: 'performed_by', as: 'performer' });
};
module.exports = AssetHistory;
