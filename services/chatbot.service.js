const { chatModel, embeddingModel } = require('../config/gemini');
const { getPineconeIndex } = require('../config/pinecone');

const SYSTEM_INSTRUCTION = `Bạn là trợ lý AI của hệ thống quản lý nhà trọ Fscape. 
Nhiệm vụ của bạn là trả lời các câu hỏi liên quan đến tòa nhà, phòng trống, hợp đồng, đặt phòng, hóa đơn và các thông tin về hệ thống.

NGUYÊN TẮC:
1. CHỈ trả lời dựa trên thông tin được cung cấp trong phần "THÔNG TIN HỆ THỐNG" bên dưới.
2. Nếu câu hỏi không liên quan đến hệ thống hoặc không có đủ thông tin, hãy thông báo rõ ràng và lịch sự.
3. Trả lời bằng ngôn ngữ mà người dùng sử dụng (tiếng Việt hoặc tiếng Anh).
4. Trình bày câu trả lời rõ ràng, dễ đọc. Dùng danh sách khi cần liệt kê.
5. Không bịa đặt thông tin. Nếu không có dữ liệu, hãy nói "Hiện tại tôi không có thông tin về vấn đề này."`;

/**
 * Create embedding for the user query.
 */
async function embedQuery(text) {
  const result = await embeddingModel.embedContent(text);
  return Array.from(result.embedding.values);
}

/**
 * Perform semantic retrieval in Pinecone and return context chunks.
 */
async function retrieveContext(query, topK = 6) {
  const index = getPineconeIndex();
  const queryVector = await embedQuery(query);

  const searchResult = await index.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });

  if (!searchResult.matches || searchResult.matches.length === 0) {
    return [];
  }

  // Keep matches with similarity score >= 0.6.
  return searchResult.matches
    .filter(m => m.score >= 0.6)
    .map(m => m.metadata?.content || '');
}

/**
 * Build prompt with retrieved VectorDB context.
 */
function buildPromptWithContext(contextChunks) {
  if (contextChunks.length === 0) {
    return `${SYSTEM_INSTRUCTION}\n\nTHÔNG TIN HỆ THỐNG: Không tìm thấy thông tin liên quan.`;
  }

  const contextText = contextChunks
    .map((chunk, i) => `[${i + 1}] ${chunk}`)
    .join('\n');

  return `${SYSTEM_INSTRUCTION}\n\nTHÔNG TIN HỆ THỐNG:\n${contextText}`;
}

/**
 * Main chat function for the RAG pipeline.
 * @param {string} message - Current user message.
 * @param {Array} history - Gemini chat history [{ role, parts: [{ text }] }].
 * @returns {string} Model response text.
 */
async function chat(message, history = []) {
  // 1. Retrieve relevant context from VectorDB
  const contextChunks = await retrieveContext(message);

  // 2. Build system prompt with context
  const systemPromptText = buildPromptWithContext(contextChunks);

  // 3. Build chat session with context injected as first system turn
  const systemTurn = {
    role: 'user',
    parts: [{ text: systemPromptText }]
  };
  const systemAck = {
    role: 'model',
    parts: [{ text: 'Tôi đã hiểu. Tôi sẽ chỉ trả lời dựa trên thông tin hệ thống được cung cấp.' }]
  };

  // Merge system context, previous history, and current message.
  const fullHistory = [systemTurn, systemAck, ...history];

  const chatSession = chatModel.startChat({
    history: fullHistory,
  });

  // 4. Send user message and get response
  const result = await chatSession.sendMessage(message);
  const reply = result.response.text();

  return reply;
}

module.exports = { chat, retrieveContext, embedQuery };
