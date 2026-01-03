/**
 * 🔧 LangChain Tool Example
 * Function calling with Ollama using LangChain tools
 */

import { configDotenv } from "dotenv";
import { ChatOllama } from "@langchain/ollama";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 🔐 Load environment variables
configDotenv();

// 🛠️ Define custom tool with schema
const getTemperatureTool = tool(
  async ({ city }) => {
    const temperatures = {
      'New York': '22°C',
      'London': '15°C',
      'Tokyo': '18°C',
    };
    const temp = temperatures[city] ?? 'Unknown';
    console.log(`🔧 Tool called: get_temperature for ${city} -> ${temp}`);
    return temp;
  },
  {
    name: "get_temperature",
    description: "Get the current temperature for a city",
    schema: z.object({
      city: z.string().describe("The name of the city"),
    }),
  }
);

// 🤖 Initialize Ollama client
const model = new ChatOllama({
  model: "kimi-k2:1t",
  baseUrl: "https://ollama.com",
  headers: {
    Authorization: "Bearer " + process.env.OLLAMA_API_KEY,
  },
});

// 🔗 Bind tool to model
const modelWithTools = model.bindTools([getTemperatureTool]);

// 🚀 Send message with tool capability
const response = await modelWithTools.invoke("What's the temperature in Tokyo?");

// 📤 Output initial response
console.log("\n🤖 AI Message:", response.content);

// 🔄 Handle tool calls if present
if (response.tool_calls && response.tool_calls.length > 0) {
  console.log("\n🔧 Tool Calls Detected:", response.tool_calls);
  
  // ⚙️ Execute the tool
  const toolCall = response.tool_calls[0];
  const toolResult = await getTemperatureTool.invoke(toolCall.args);
  
  console.log("\n✅ Tool Result:", toolResult);
  
  // 📨 Build conversation with tool result
  const messages = [
    { role: "user", content: "What's the temperature in Tokyo?" },
    response,
    {
      role: "tool",
      content: toolResult,
      tool_call_id: toolCall.id,
    },
  ];
  
  // 💬 Get final response
  const finalResponse = await model.invoke(messages);
  console.log("\n💬 Final Answer:", finalResponse.content);
} else {
  // ⚠️ No tool calls made
  console.log("\n⚠️ No tool calls were made.");
}