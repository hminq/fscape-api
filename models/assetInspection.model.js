const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AssetInspection = sequelize.define('AssetInspection', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  performed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('CHECK_IN', 'CHECK_OUT'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('PENDING_SETTLEMENT', 'SETTLED', 'NO_DISCREPANCY'),
    allowNull: false,
    defaultValue: 'NO_DISCREPANCY'
  },
  penalty_total: {
    type: DataTypes.DECIMAL,
    allowNull: true,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'asset_inspections',
  schema: 'public',
  timestamps: true,
  updatedAt: false,
  underscored: true,
  indexes: [
    {
      name: "idx_asset_inspections_room_id",
      fields: [{ name: "room_id" }]
    },
    {
      name: "idx_asset_inspections_performed_by",
      fields: [{ name: "performed_by" }]
    }
  ]
});

AssetInspection.associate = (models) => {
  AssetInspection.belongsTo(models.Room, { foreignKey: 'room_id', as: 'room' });
  AssetInspection.belongsTo(models.User, { foreignKey: 'performed_by', as: 'performer' });
  AssetInspection.hasMany(models.AssetInspectionItem, { foreignKey: 'inspection_id', as: 'items' });
};

module.exports = AssetInspection;
