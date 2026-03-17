const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BuildingImage = sequelize.define('BuildingImage', {
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
    image_url: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'building_images',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "building_images_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      }, {
        name: "idx_building_images_building_id",
        fields: [
          { name: "building_id" },
        ]
      },
    ]
  });

BuildingImage.associate = (models) => {
  BuildingImage.belongsTo(models.Building, { 
    foreignKey: 'building_id', 
    as: 'building' 
  });
};
module.exports = BuildingImage;
