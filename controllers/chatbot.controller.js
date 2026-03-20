const chatbotService = require('../services/chatbot.service');
const knowledgeService = require('../services/knowledge.service');

/**
 * POST /api/chatbot/chat
 * Body: { message: string, history?: Array }
 */
const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Tin nhắn không được để trống.' });
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({ error: 'Tin nhắn quá dài (tối đa 1000 ký tự).' });
    }

    const reply = await chatbotService.chat(message.trim(), history);

    return res.json({
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ChatbotController] chat error:', error.message);
    return res.status(500).json({ error: 'Không thể xử lý yêu cầu. Vui lòng thử lại sau.' });
  }
};

/**
 * POST /api/chatbot/sync
 * Sync knowledge base từ DB vào Pinecone — admin only
 */
const syncKnowledge = async (req, res) => {
  try {
    console.log('[ChatbotController] Starting knowledge sync...');
    const totalCount = await knowledgeService.syncKnowledge();
    return res.json({
      message: 'Knowledge base synced successfully.',
      total_vectors: totalCount,
    });
  } catch (error) {
    console.error('[ChatbotController] syncKnowledge error:', error.message);
    console.error('[ChatbotController] syncKnowledge stack:', error.stack);
    return res.status(500).json({
      error: 'Không thể sync knowledge base.',
      detail: error.message,
    });
  }
};

module.exports = { chat, syncKnowledge };
