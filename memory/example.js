/**
 * 💬 Memory-Enhanced Chat Example
 * Interactive chat with persistent memory using Mem0 and Ollama LLM
 * Remembers user preferences and context across conversations
 */

import { addMemory, searchMemory } from './index.js';
import { ollama } from '../app.js';
import * as readline from 'readline';

// 👤 Generate unique user ID for this session
const userId = "user-" + Date.now();

// 🖥️ Setup readline interface for terminal input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ❓ Helper function to prompt user for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// 🚀 Start chat session
console.log("🤖 Chat with AI (with memory). Type 'exit' to quit.\n");

// 📝 Initialize chat history array
const chatHistory = [];

// ♾️ Infinite chat loop
while (true) {
  // 📥 Get user input
  const userInput = await prompt("You: ");
  
  // 🚪 Check for exit command
  if (userInput.toLowerCase() === 'exit') {
    console.log("👋 Goodbye!");
    rl.close();
    break;
  }

  // 🔍 Search for relevant memories based on user input
  const memories = await searchMemory(userInput, userId);
  
  // 🧠 Build context from retrieved memories
  let memoryContext = "";
  if (memories && memories.length > 0) {
    memoryContext = "\n[Relevant memories: " + memories.map(m => m.memory).join("; ") + "]\n";
  }

  // ➕ Add user message to chat history
  chatHistory.push({ role: "user", content: userInput });

  // 📨 Create messages array with memory context for LLM
  const messagesWithContext = [
    { role: "system", content: `You are a helpful assistant. Remember previous context.${memoryContext}` },
    ...chatHistory
  ];

  // 🚀 Send to LLM and get response
  const response = await ollama.invoke(messagesWithContext);
  const assistantMessage = response.content;

  // 📤 Output the response
  console.log(`\n🤖 Assistant: ${assistantMessage}\n`);

  // ➕ Add assistant response to chat history
  chatHistory.push({ role: "assistant", content: assistantMessage });

  // 💾 Save conversation turn to persistent memory
  await addMemory([
    { role: "user", content: userInput },
    { role: "assistant", content: assistantMessage }
  ], userId);
}
