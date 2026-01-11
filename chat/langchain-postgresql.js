/**
 * 🗄️ LangChain PostgreSQL Example
 * Database querying with Ollama using LangChain agents
 */

import { MemorySaver } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { configDotenv } from "dotenv";
import { createAgent, createMiddleware, tool } from "langchain";
import PG from "pg";
import z from "zod";
const checkpointer = new MemorySaver();
// 🔐 Load environment variables
const { Pool } = PG;
configDotenv();

// 🗃️ PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🛠️ Database query function
const executeQuery = async ({ query }) => {
  try {
    const result = await pool.query(query);
    return JSON.stringify(result.rows);
  } catch (error) {
    return `Error: ${error.message}`;
  }
};

// 🔧 Define PostgreSQL query tool
const postgresQueryTool = tool(executeQuery, {
  name: "query_postgresql",
  description:
    "Run a PostgreSQL query and get results. Use PostgreSQL syntax only. To list tables use: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
  schema: z.object({
    query: z.string().describe("PostgreSQL query to execute"),
  }),
});

const customStateSchema = z.object({  
    userId: z.string(),  
    preferences: z.record(z.string(), z.any()),  
}); 

const stateExtensionMiddleware = createMiddleware({
    name: "StateExtension",
    stateSchema: customStateSchema,  
});

// 🤖 Initialize Ollama model
const model = new ChatOllama({
  model: "kimi-k2:1t",
  baseUrl: "https://ollama.com",
  headers: {
    Authorization: "Bearer " + process.env.OLLAMA_API_KEY,
  },
});

// 🤖 Create agent with Ollama model and tools
const agent = createAgent({
  model: model,
  tools: [postgresQueryTool],
   middleware: [stateExtensionMiddleware],  
    checkpointer,
});

// 🚀 Invoke agent and output result
console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "how many tables i have"}],
    
    userId:"user123",
    preferences:{theme: "dark" },
  },{ configurable: { thread_id: "1" } })
);
