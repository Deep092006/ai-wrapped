/**
 * 📚 RAG Indexing Script
 * Loads PDF documents, splits into chunks, and stores in Qdrant vector database
 */

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OllamaEmbeddings } from "@langchain/ollama";
import { configDotenv } from "dotenv";

// 🔐 Load environment variables
configDotenv()

// 📄 Define PDF path
const nike10kPdfPath = "./rag/nodejs_tutorial.pdf"

// 📥 Initialize PDF loader
const loader = new PDFLoader(nike10kPdfPath)

// 📖 Load PDF documents
const docs = await loader.load()

// ✂️ Initialize text splitter with chunk settings
const splitter = new RecursiveCharacterTextSplitter({ 
  chunkSize: 100, 
  chunkOverlap: 50 
})

// 🔪 Split documents into chunks
const texts = await splitter.splitDocuments(docs)

// 🧠 Initialize embedding model
const embeddings = new OllamaEmbeddings({
  model: "embeddinggemma",
  baseUrl: "http://localhost:11434",
});

// 🔍 Check if collection exists and has documents
let vectorStore;
try {
  console.log("🔍 Checking if collection exists...");
  const response = await fetch(`${process.env.QDRANT_URL}/collections/${process.env.QDRANT_COLLECTION}`, {
    headers: { "api-key": process.env.QDRANT_API_KEY },
  });
  const data = await response.json();
  
  if (data.result.points_count > 0) {
    console.log(`✅ Collection has ${data.result.points_count} documents. Skipping indexing...`);
    // 📦 Use existing collection
    vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: process.env.QDRANT_COLLECTION,
    });
  } else {
    throw new Error("Collection is empty");
  }
} catch (error) {
  console.log("📚 Indexing documents...");
  // 🆕 Create new collection and index documents
  vectorStore = await QdrantVectorStore.fromDocuments(texts, embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: process.env.QDRANT_COLLECTION,
  });
  console.log("✅ Documents indexed!");
}

// 🔎 Test similarity search
console.log(await vectorStore.similaritySearch("node VS JS", 5));
  