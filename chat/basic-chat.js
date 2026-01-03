/**
 * 💬 Basic Chat Example
 * Simple one-shot conversation with Ollama using LangChain
 */

import { ChatOllama } from "@langchain/ollama";
import { configDotenv } from "dotenv";

// 🔐 Load environment variables
configDotenv();

// 🤖 Initialize Ollama client
const ollama = new ChatOllama({
  baseUrl: "https://ollama.com",
  headers: {
    Authorization: "Bearer " + process.env.OLLAMA_API_KEY,
  },
  model: "kimi-k2:1t",
});

// 📨 Define the message payload
const messages = [
  { role: "user", content: "hey" }
];

// 🚀 Send message and get response
const response = await ollama.invoke(messages);

// 📤 Output the response
console.log(response.content);
