const { Pinecone } = require('@pinecone-database/pinecone');

let pineconeClient = null;

const getPineconeClient = () => {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
};

const getPineconeIndex = () => {
  const client = getPineconeClient();
  return client.index(process.env.PINECONE_INDEX || 'fscape');
};

module.exports = { getPineconeClient, getPineconeIndex };
