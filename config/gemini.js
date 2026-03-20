const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// gemini-embedding-001: model đúng, hỗ trợ embedContent trên v1beta
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
const chatModel = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

module.exports = { genAI, embeddingModel, chatModel };