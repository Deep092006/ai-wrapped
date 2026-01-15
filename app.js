import { ChatOllama } from "@langchain/ollama";
import { configDotenv } from "dotenv";

configDotenv();

// Initialize Ollama LLM
export const ollama = new ChatOllama({
  baseUrl: "https://ollama.com",
  headers: {
    Authorization: "Bearer " + process.env.OLLAMA_API_KEY,
  },
  model: "rnj-1:8b",
});

// Example usage
const messages = [{ role: 'user', content: "hey" }];

const response = await ollama.invoke(messages);
console.log(response.content);
