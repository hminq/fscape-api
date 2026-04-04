const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
// POST /api/chatbot/chat — public, không cần đăng nhập
router.post('/chat', chatbotController.chat);

// POST /api/chatbot/sync — chỉ admin mới được gọi
router.post('/sync', authJwt, requireRoles('ADMIN'), chatbotController.syncKnowledge);

module.exports = router;
