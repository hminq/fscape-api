const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Facility = sequelize.define('Facility', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "facilities_name_key"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    tableName: 'facilities',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "facilities_name_key",
        unique: true,
        fields: [
          { name: "name" },
        ]
      }, {
        name: "facilities_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

Facility.associate = (models) => {
  Facility.belongsToMany(models.Building, {
    through: models.BuildingFacility,
    foreignKey: 'facility_id',
    otherKey: 'building_id',
    as: 'buildings'
  });
};
module.exports = Facility;
