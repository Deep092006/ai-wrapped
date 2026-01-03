import {ChatOllama} from "@langchain/ollama"
import { configDotenv } from "dotenv";
configDotenv()
const ollama = new ChatOllama({
  baseUrl: "https://ollama.com",
  headers: {
    Authorization: "Bearer " + process.env.OLLAMA_API_KEY,
  },
  model: "kimi-k2:1t",
});

const messages = [{ role: 'user', content: "hey" }]

const response = await ollama.invoke(messages)
console.log(response.content);
