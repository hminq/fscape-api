const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Location = require('./location.model');
const BuildingImage = require('./buildingImage.model');
const Facility = require('./facility.model');
const BuildingFacility = require('./buildingFacility.model');

const Building = sequelize.define('Building', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  location_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { 
      model: 'locations',
      key: 'id' 
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL,
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  total_floors: {
    type: DataTypes.SMALLINT,
    allowNull: true
  },
  thumbnail_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true
  }
}, {
  tableName: 'buildings',
  schema: 'public',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: "buildings_pkey",
      unique: true,
      fields: [
        { name: "id" },
      ]
    },
    {
      name: "idx_buildings_coordinates",
      fields: [
        { name: "latitude" },
        { name: "longitude" },
      ]
    },
    {
      name: "idx_buildings_is_active",
      fields: [
        { name: "is_active" },
      ]
    }, {
      name: "idx_buildings_location_id",
      fields: [
        { name: "location_id" },
      ]
    },
  ]
});

Building.associate = (models) => {
  Building.belongsTo(models.Location, {
    foreignKey: 'location_id',
    as: 'location'
  });

Building.hasMany(BuildingImage, {
  foreignKey: 'building_id',
  as: 'images'
});

  Building.belongsToMany(models.Facility, {
    through: models.BuildingFacility,
    foreignKey: 'building_id',
    otherKey: 'facility_id',
    as: 'facilities'
  });

  Building.hasMany(models.Room, {
    foreignKey: 'building_id',
    as: 'rooms'
  });

  Building.hasOne(models.User, {
    foreignKey: 'building_id',
    as: 'manager'
  });
};

module.exports = Building;
