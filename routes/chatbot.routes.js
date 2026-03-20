const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
// POST /api/chatbot/chat — yêu cầu đăng nhập
router.post('/chat', authJwt, chatbotController.chat);

// POST /api/chatbot/sync — chỉ admin mới được gọi
router.post('/sync', authJwt, chatbotController.syncKnowledge);

module.exports = router;
