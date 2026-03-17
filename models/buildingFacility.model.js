const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BuildingFacility = sequelize.define('BuildingFacility', {
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
      unique: "building_facilities_building_id_facility_id_key"
    },
    facility_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'facilities',
        key: 'id'
      },
      unique: "building_facilities_building_id_facility_id_key"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    tableName: 'building_facilities',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "building_facilities_building_id_facility_id_key",
        unique: true,
        fields: [
          { name: "building_id" },
          { name: "facility_id" },
        ]
      },
      {
        name: "building_facilities_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_building_facilities_building_id",
        fields: [
          { name: "building_id" },
        ]
      }, {
        name: "idx_building_facilities_facility_id",
        fields: [
          { name: "facility_id" },
        ]
      },
    ]
  });

BuildingFacility.associate = (models) => {
  BuildingFacility.belongsTo(models.Building, { foreignKey: 'building_id' });
  BuildingFacility.belongsTo(models.Facility, { foreignKey: 'facility_id' });
};
module.exports = BuildingFacility;
