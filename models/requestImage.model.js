const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RequestImage = sequelize.define('RequestImage', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    request_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'requests',
        key: 'id'
      }
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    image_type: {
      type: DataTypes.ENUM("ATTACHMENT","COMPLETION"),
      allowNull: true,
      defaultValue: "ATTACHMENT"
    },
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'request_images',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "idx_request_images_request_id",
        fields: [
          { name: "request_id" },
        ]
      }, {
        name: "request_images_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

RequestImage.associate = (models) => {
  RequestImage.belongsTo(models.Request, { foreignKey: 'request_id', as: 'request' });
  RequestImage.belongsTo(models.User, { foreignKey: 'uploaded_by', as: 'uploader' });
};
module.exports = RequestImage;
