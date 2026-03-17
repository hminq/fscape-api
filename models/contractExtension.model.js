const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ContractExtension = sequelize.define('ContractExtension', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    contract_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'contracts',
        key: 'id'
      }
    },
    previous_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    new_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    extension_months: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'contract_extensions',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "contract_extensions_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      }, {
        name: "idx_contract_extensions_contract_id",
        fields: [
          { name: "contract_id" },
        ]
      },
    ]
  });

ContractExtension.associate = (models) => {
    ContractExtension.belongsTo(models.Contract, { foreignKey: 'contract_id', as: 'contract' });
    ContractExtension.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approver' });
};

module.exports = ContractExtension;
