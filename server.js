require("dotenv").config();
const app = require("./app");
const { connectDB, sequelize } = require("./config/db");

// Phase 1: Independent Tables
require("./models/location.model");
require("./models/facility.model");
require("./models/roomType.model");
require("./models/assetType.model");

// Phase 2: Core Tables
require("./models/university.model");
require("./models/user.model");
require("./models/building.model");

// Phase 3: Infrastructure & Profiles
require("./models/buildingImage.model");
require("./models/buildingFacility.model");
require("./models/room.model");
require("./models/authProvider.model");
require("./models/customerProfile.model");
require("./models/refreshToken.model");
require("./models/otpCode.model");
require("./models/contractTemplate.model");

// Phase 4: Room Details & Assets
require("./models/roomImage.model");
require("./models/asset.model");
require("./models/roomTypeAsset.model");

// Phase 5: Business Core
require("./models/contract.model");
require("./models/assetHistory.model");
require("./models/assetInspection.model");
require("./models/assetInspectionItem.model");

// Phase 6: Operational & Financial (Part 1)
require("./models/contractExtension.model");
require("./models/invoice.model");
require("./models/settlement.model");
require("./models/settlementItem.model");
require("./models/violationPenalty.model");

// Phase 7: Financial & Details (Part 2)
require("./models/payment.model");
require("./models/invoiceItem.model");
require("./models/booking.model");
require("./models/request.model");
require("./models/requestImage.model");
require("./models/requestStatusHistory.model");

// Phase 8: System & Communications
require("./models/notification.model");
require("./models/notificationRecipient.model");
require("./models/auditLog.model");
require("./models/scheduledJob.model");
require("./models/emailTemplate.model");
require("./models/emailLog.model");

const models = sequelize.models;

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

const { initCronJobs } = require("./jobs");

const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
  try {

    // await sequelize.sync({ alter: true }); // Dòng code cũ gây lỗi Foreign Key

    // Danh sách các model theo thứ tự phụ thuộc để tránh lỗi Foreign Key
    // const modelsToSync = [
    //   'Location', 'Facility', 'RoomType', 'AssetType',
    //   'University', 'User', 'Building',
    //   'BuildingImage', 'BuildingFacility', 'Room',
    //   'AuthProvider', 'CustomerProfile', 'RefreshToken', 'OtpCode', 'ContractTemplate',
    //   'RoomImage', 'Asset', 'RoomTypeAsset',
    //   'Contract', 'AssetHistory', 'AssetInspection',
    //   'ContractExtension', 'Invoice', 'Settlement', 'SettlementItem', 'ViolationPenalty',
    //   'Payment', 'InvoiceItem', 'Booking', 'Request', 'RequestImage', 'RequestStatusHistory',
    //   'Notification', 'NotificationRecipient', 'AuditLog', 'ScheduledJob', 'EmailTemplate', 'EmailLog'
    // ];

    // console.log("Starting database sync...");
    // for (const modelName of modelsToSync) {
    //   if (sequelize.models[modelName]) {
    //     await sequelize.models[modelName].sync({ alter: true });
    //   }
    // }

    // console.log("Database synced");

    initCronJobs();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at Port:${PORT}`);
    });

  } catch (error) {
    console.error("DB Connect Error:", error);
  }
});
