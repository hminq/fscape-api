const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const University = sequelize.define('University', {
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
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    tableName: 'universities',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_universities_location_id",
        fields: [
          { name: "location_id" },
        ]
      },
      {
        name: "idx_universities_name",
        fields: [
          { name: "name" },
        ]
      }, {
        name: "universities_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

University.associate = (models) => {
  University.belongsTo(models.Location, {
    foreignKey: 'location_id',
    as: 'location'
  });
};
module.exports = University;
