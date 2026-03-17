const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ScheduledJob = sequelize.define('ScheduledJob', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    job_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    job_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "PENDING"
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    records_processed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'scheduled_jobs',
    schema: 'public',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "idx_scheduled_jobs_created_at",
        fields: [
          { name: "created_at" },
        ]
      },
      {
        name: "idx_scheduled_jobs_job_type",
        fields: [
          { name: "job_type" },
        ]
      },
      {
        name: "idx_scheduled_jobs_status",
        fields: [
          { name: "status" },
        ]
      }, {
        name: "scheduled_jobs_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

module.exports = ScheduledJob;
