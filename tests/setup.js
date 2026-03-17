const { sequelize } = require('../config/db');

// Load all models and associations (Cấu hình giống server.js nhưng cho môi trường test)
require("../models/location.model");
require("../models/facility.model");
require("../models/roomType.model");
require("../models/assetType.model");
require("../models/university.model");
require("../models/user.model");
require("../models/building.model");
require("../models/buildingImage.model");
require("../models/buildingFacility.model");
require("../models/room.model");
require("../models/authProvider.model");
require("../models/customerProfile.model");
require("../models/refreshToken.model");
require("../models/otpCode.model");
require("../models/contractTemplate.model");
require("../models/roomImage.model");
require("../models/asset.model");
require("../models/roomTypeAsset.model");
require("../models/contract.model");
require("../models/assetHistory.model");
require("../models/assetInspection.model");
require("../models/contractExtension.model");
require("../models/invoice.model");
require("../models/settlement.model");
require("../models/settlementItem.model");
require("../models/violationPenalty.model");
require("../models/payment.model");
require("../models/invoiceItem.model");
require("../models/booking.model");
require("../models/request.model");
require("../models/requestImage.model");
require("../models/requestStatusHistory.model");
require("../models/notification.model");
require("../models/notificationRecipient.model");
require("../models/auditLog.model");
require("../models/scheduledJob.model");
require("../models/emailTemplate.model");
require("../models/emailLog.model");

const models = sequelize.models;
Object.keys(models).forEach((modelName) => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

beforeAll(async () => {
    // Sử dụng force: true để tạo lại schema sạch cho mỗi lần chạy test trong SQLite in-memory
    await sequelize.sync({ force: true });
});

afterAll(async () => {
    await sequelize.close();
});
