/**
 * 🧠 Mem0 Memory Client
 * Persistent memory storage for AI conversations using Mem0
 */

import MemoryClient from 'mem0ai';
import { configDotenv } from "dotenv";

// 🔐 Load environment variables
configDotenv();

// 🧠 Initialize Mem0 client
const client = new MemoryClient({ 
  apiKey: process.env.MEM0_API_KEY
});

// 💾 Add messages to memory for a user
export async function addMemory(messages, userId) {
  return await client.add(messages, { user_id: userId });
}

// 🔍 Search memory for relevant context
export async function searchMemory(query, userId) {
  const filters = {
    OR: [{ user_id: userId }]
  };
  
  return await client.search(query, { api_version: "v2", filters: filters });
}

// 📚 Get all memories for a user
export async function getMemories(userId) {
  return await client.getAll({ user_id: userId });
}

// 📤 Export client for direct access
export default client;
