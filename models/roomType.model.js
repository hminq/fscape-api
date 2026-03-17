const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RoomType = sequelize.define('RoomType', {
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
    base_price: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    deposit_months: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: 1
    },
    capacity_min: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: 1
    },
    capacity_max: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: 1
    },
    bedrooms: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: 1
    },
    bathrooms: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: 1
    },
    area_sqm: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    tableName: 'room_types',
    schema: 'public',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      {
        name: "idx_room_types_base_price",
        fields: [
          { name: "base_price" },
        ]
      },
      {
        name: "idx_room_types_is_active",
        fields: [
          { name: "is_active" },
        ]
      }, {
        name: "room_types_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

RoomType.associate = (models) => {
  RoomType.hasMany(models.RoomTypeAsset, { foreignKey: 'room_type_id', as: 'template_assets' });
};

module.exports = RoomType;
