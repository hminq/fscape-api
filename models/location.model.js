const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Location = sequelize.define('Location', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "locations_name_key"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    tableName: 'locations',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_locations_is_active",
        fields: [
          { name: "is_active" },
        ]
      },
      {
        name: "locations_name_key",
        unique: true,
        fields: [
          { name: "name" },
        ]
      }, {
        name: "locations_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

Location.associate = (models) => {
  Location.hasMany(models.Building, { 
    foreignKey: 'location_id', 
    as: 'buildings' 
  });

  Location.hasMany(models.University, { 
    foreignKey: 'location_id', 
    as: 'universities' 
  });
};
module.exports = Location;
