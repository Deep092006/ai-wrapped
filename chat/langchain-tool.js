/**
 * 🔧 LangChain Tool Example
 * Function calling using LangChain createAgent with Ollama
 */

import { configDotenv } from "dotenv";
import { createAgent, tool } from "langchain";
import { ChatOllama } from "@langchain/ollama";
import * as z from "zod";

// 🔐 Load environment variables
configDotenv();

// 🛠️ Define custom tool with schema
const getWeather = tool(
  (input) => `It's always sunny in ${input.city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string().describe("The city to get the weather for"),
    }),
  }
);
const getTemperatureTool = tool(
  async ({ city }) => {
    const temperatures = {
      'New York': '22°C',
      'London': '15°C',
      'Tokyo': '18°C',
      'Paris': '17°C',
      'Sydney': '25°C',
    };
    const temp = temperatures[city] ?? 'Unknown';
    return `The current temperature in ${city} is ${temp}`;
  },
  {
    name: "get_temperature",
    description: "Get the current temperature for a city",
    schema: z.object({
      city: z.string().describe("The name of the city"),
    }),
  }
);

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
  tools: [getWeather,getTemperatureTool],
});

// 🚀 Invoke agent and output result
const agentStream = await agent.stream(
  { messages: [{ role: "user", content: "what is the weather and temperature in New York" }] },
  { streamMode: "updates" }
)
for await (const chunk of agentStream) {
  if (chunk.model_request) {
  console.log("📤 Model Request:", chunk.model_request.messages[0].content);
  }
  if (chunk.tools) {
  console.log("🔧 Tool Response:", chunk.tools.messages[0].content);
  }
}
