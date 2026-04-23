const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
// POST /api/chatbot/chat (public).
router.post('/chat', chatbotController.chat);

// POST /api/chatbot/sync (ADMIN only).
router.post('/sync', authJwt, requireRoles('ADMIN'), chatbotController.syncKnowledge);

module.exports = router;
