/**
 * 🔄 LangGraph Interrupt Workflow Example
 * LinkedIn post generator with human-in-the-loop refinement using PostgreSQL checkpointer
 */

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import * as z from "zod";
import { ollama } from "../app.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import * as readline from 'readline';

/**
 * 📚 Key LangGraph Concepts Used:
 * 
 * 1️⃣ Interrupt Before/After - Pauses workflow at specific nodes for human input
 * 2️⃣ PostgresSaver Checkpointer - Persists state to PostgreSQL database
 * 3️⃣ State Updates - graph.updateState() modifies state during interrupts
 * 4️⃣ Resume from Checkpoint - invoke(null, config) continues from last state
 * 
 * 💡 Checkpointing Features (from checkpoints.js):
 * - MemorySaver/PostgresSaver stores workflow state at each step
 * - thread_id: Unique conversation session identifier
 * - checkpoint_id: Specific state snapshot for time-travel
 * - graph.getState(config): Get current state and next nodes
 * - graph.getStateHistory(config): Retrieve all historical states
 * - Enables workflow pause/resume, debugging, and state inspection
 * 
 * 🔧 Usage:
 * - interruptBefore: ["nodeName"] - Pause before executing node
 * - interruptAfter: ["nodeName"] - Pause after node completes
 * - Human can review, modify, or reject before continuing
 */

// 🗄️ Database connection string
const DB_URI = "postgresql://neondb_owner:npg_H7RPjzN0EaSc@ep-fragrant-mountain-ahmnh2w3-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// 💾 PostgreSQL temp memory
const saver = PostgresSaver.fromConnString(DB_URI);
await saver.setup(); // Creates tables

// 🔄 If want local temp memory
// const saver = new MemorySaver()

// 📋 Define state schema for workflow
const State = z.object({
  step: z.number(),
  messages: z.array(z.any()),
});

// ⚙️ Workflow
const workflow = new StateGraph(State)
  // ✍️ Generate node creates linkedin post content
  .addNode("generate", async (state) => {
    const systemmsg  = new SystemMessage("you are linked contenmt generater agent u generate description for post  so just generate new 1s and if user gaven u changes made changes and give full post nothing extra ")
    const res = await ollama.invoke([systemmsg,...state.messages]);
    return { step: 1, messages: [...state.messages,new SystemMessage(res.content)] };
  })
  // 🔍 Refine node finds mistakes in generated post
  .addNode("refine", async(state) => {
    const systemmsg  = new SystemMessage("you are linked  proffessiona agent u find mistakes only nothing extra just gave mistakes for example: too much empji too old fashion,too short too long ")
    const res = await ollama.invoke([systemmsg,...state.messages]);
    return { step: 2, messages: [...state.messages, new HumanMessage(res.content)] };
  })
  // 🎯 Start workflow with generate node
  .addEdge(START, "generate")
  // ➡️ After generate go to refine
  .addEdge("generate", "refine")
  // 🔀 If msg length greater than 5 generate
  .addConditionalEdges("refine", (state) => {
    if (state.messages.length < 5){
      return "generate"
    }
      return END
    
  },{
    generate: "generate",
    [END]: END,
  })

// ⏸️ Compile with interrupt so stop and ask user before execute refine
const graph = workflow.compile({ 
  checkpointer: saver,
  interruptBefore: ["refine"]  // Interrupt before refine node for human feedback
});

// 💬 Function to get user input
function getUserInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ⚙️ Config used for userid thread id etc 
const config = { configurable: { thread_id: "test-1" } };

// 🎨 Header for app
console.log("=".repeat(60));
console.log("🚀 LINKEDIN POST GENERATOR");
console.log("=".repeat(60));

// 🔁 Loop control variable
let continueLoop = true;

// 🚀 First invoke with user input to generate initial post
let state = await graph.invoke({ step: 0, messages: [{ role: 'user', content: "ai vs ml" }] }, config);

// ♾️ Infinite loop until user says no
while (continueLoop) {
  // 📊 Get current state from graph
  const currentState = await graph.getState(config);
  
  // 📝 Extract last message which is generated post
  const lastMessage = currentState.values.messages[currentState.values.messages.length - 1];

  // 📄 Display generated post to user
  console.log("\n" + "=".repeat(60));
  console.log("📄 GENERATED POST:");
  console.log("=".repeat(60));
  console.log(lastMessage.content);
  console.log("=".repeat(60));

  // ❓ Ask user if want to refine
  const userChoice = await getUserInput("\n❓ Refine this post? (yes/no): ");

  // ✅ If user says yes continue refinement else stop
  if (userChoice.trim().toLowerCase() === 'yes') {
    state = await graph.invoke(null, config);
  } else {
    console.log("\n✅ Final post saved!");
    continueLoop = false;
  }
}


// 📜 State history - Iterate through all checkpoints (commented for now)
// console.log("\n📜 STATE HISTORY:");
// for await (const state of graph.getStateHistory(config)) {
//   console.log("Checkpoint:", {
//     values: state.values,
//     next: state.next,
//     step: state.values?.step ?? "start"
//   });
// }

// 🔄 Current state - Get latest state and next nodes (commented for now)
// console.log("\n🔄 CURRENT STATE:", await graph.getState(config));

// ⏮️ Access specific checkpoint - Time-travel to exact state (commented for now)
// const specificConfig = { 
//   configurable: {
//     thread_id: "test-1",
//     checkpoint_id: "1f0f1082-66b3-6d40-8002-2be708cdab2c"  // Specific snapshot
//   } 
// };
// console.log("\n🕰️ SPECIFIC CHECKPOINT:", await graph.getState(specificConfig));
