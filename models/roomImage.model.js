const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RoomImage = sequelize.define('RoomImage', {
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
    image_url: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'room_images',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "idx_room_images_room_id",
        fields: [
          { name: "room_id" },
        ]
      }, {
        name: "room_images_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

module.exports = RoomImage;
