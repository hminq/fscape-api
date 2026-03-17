const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RequestStatusHistory = sequelize.define('RequestStatusHistory', {
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
    from_status: {
      type: DataTypes.ENUM("PENDING","ASSIGNED","PRICE_PROPOSED","APPROVED","IN_PROGRESS","DONE","COMPLETED","REVIEWED","REFUNDED","CANCELLED"),
      allowNull: true
    },
    to_status: {
      type: DataTypes.ENUM("PENDING","ASSIGNED","PRICE_PROPOSED","APPROVED","IN_PROGRESS","DONE","COMPLETED","REVIEWED","REFUNDED","CANCELLED"),
      allowNull: false
    },
    changed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'request_status_history',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "idx_request_status_history_created_at",
        fields: [
          { name: "created_at" },
        ]
      },
      {
        name: "idx_request_status_history_request_id",
        fields: [
          { name: "request_id" },
        ]
      }, {
        name: "request_status_history_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

RequestStatusHistory.associate = (models) => {
  RequestStatusHistory.belongsTo(models.Request, { foreignKey: 'request_id', as: 'request' });
  RequestStatusHistory.belongsTo(models.User, { foreignKey: 'changed_by', as: 'modifier' });
};
module.exports = RequestStatusHistory;
