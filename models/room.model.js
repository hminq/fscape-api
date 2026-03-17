const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Room = sequelize.define('Room', {
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
      },
      unique: "rooms_building_id_room_number_key"
    },
    room_type_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'room_types',
        key: 'id'
      }
    },
    room_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: "rooms_building_id_room_number_key"
    },
    floor: {
      type: DataTypes.SMALLINT,
      allowNull: true
    },
    thumbnail_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_3d_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    blueprint_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("AVAILABLE","OCCUPIED","LOCKED"),
      allowNull: true,
      defaultValue: "AVAILABLE"
    }
  }, {
    tableName: 'rooms',
    schema: 'public',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      {
        name: "idx_rooms_building_id",
        fields: [
          { name: "building_id" },
        ]
      },
      {
        name: "idx_rooms_floor",
        fields: [
          { name: "floor" },
        ]
      },
      {
        name: "idx_rooms_room_type_id",
        fields: [
          { name: "room_type_id" },
        ]
      },
      {
        name: "idx_rooms_status",
        fields: [
          { name: "status" },
        ]
      },
      {
        name: "rooms_building_id_room_number_key",
        unique: true,
        fields: [
          { name: "building_id" },
          { name: "room_number" },
        ]
      }, {
        name: "rooms_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

Room.associate = (models) => {

  Room.belongsTo(models.Building, {
    foreignKey: 'building_id',
    as: 'building'
  })

  Room.belongsTo(models.RoomType, {
    foreignKey: 'room_type_id',
    as: 'room_type'
  })

  Room.hasMany(models.RoomImage, {
    foreignKey: 'room_id',
    as: 'images',
    onDelete: 'CASCADE'
  })

  Room.hasMany(models.Asset, {
    foreignKey: 'current_room_id',
    as: 'assets'
  })

  Room.hasMany(models.Booking, {
    foreignKey: 'room_id',
    as: 'bookings'
  })

  Room.hasMany(models.Contract, {
    foreignKey: 'room_id',
    as: 'contracts'
  })

  Room.hasMany(models.Request, {
    foreignKey: 'room_id',
    as: 'requests'
  })
}

module.exports = Room;
