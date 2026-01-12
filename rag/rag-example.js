/**
 * 📚 RAG Usage Example
 * Simple multi-user document storage & search
 */

import { 
  newChatId,
  chunkPDF, 
  chunkText,
  addDocs, 
  search
} from "./rag-utils.js";

// 🆔 Create new chat for user
const chatId = newChatId("user_123");
console.log(`✅ Created chat: ${chatId}`);

// 📄 Load and chunk PDF
const chunks = await chunkPDF("./nodejs_tutorial.pdf");

// 📥 Add documents to chat
await addDocs("user_123", chatId, chunks);
console.log(`✅ Added ${chunks.length} chunks to chat`);

// 🔍 Search in chat
const results = await search("user_123", chatId, "node js", 5);
console.log(`\n📊 Found ${results.length} results`);
results.forEach((r, i) => {
  console.log(`${i + 1}. ${r.pageContent}`);
});

