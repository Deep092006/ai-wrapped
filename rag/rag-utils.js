/**
 * 📚 Multi-User RAG Utility
 * Clean functions for multi-user document storage & search
 */

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OllamaEmbeddings } from "@langchain/ollama";
import { configDotenv } from "dotenv";

// 🔐 Load environment variables
configDotenv({ path: "../.env" });

// 🧠 Initialize embedding model
const embeddings = new OllamaEmbeddings({
  model: "embeddinggemma",
  baseUrl: "http://localhost:11434",
});

// 💾 Vector store connection
let vectorStore = null;

// 🔌 Connect to Qdrant collection
export async function connect() {
  if (vectorStore) return vectorStore;
  
  vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: process.env.QDRANT_COLLECTION,
  });
  
  return vectorStore;
}

// 📄 Load and chunk a PDF file
export async function chunkPDF(filePath, chunkSize = 500, chunkOverlap = 50) {
  const loader = new PDFLoader(filePath);
  const docs = await loader.load();
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });
  
  return splitter.splitDocuments(docs);
}

// 📝 Chunk plain text
export async function chunkText(text, chunkSize = 500, chunkOverlap = 50) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });
  
  return splitter.createDocuments([text]);
}

// 🆔 Generate new chat ID for a user
export function newChatId(userId) {
  return `${userId}_${Date.now()}`;
}

// 📥 Add documents for a user + chat
export async function addDocs(userId, chatId, documents) {
  if (!userId || !chatId) {
    throw new Error("Both userId and chatId are required");
  }
  
  await connect();
  
  const docsWithMetadata = documents.map(doc => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      user_id: userId,
      chat_id: chatId,
    }
  }));
  
  await vectorStore.addDocuments(docsWithMetadata);
  return docsWithMetadata.length;
}

// 🔍 Search documents by user + chat
export async function search(userId, chatId, query, k = 5) {
  if (!userId || !chatId) {
    throw new Error("Both userId and chatId are required");
  }
  
  await connect();
  
  return vectorStore.similaritySearch(query, k, {
    must: [
      { key: "metadata.user_id", match: { value: userId } },
      { key: "metadata.chat_id", match: { value: chatId } }
    ]
  });
}

