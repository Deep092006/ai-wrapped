import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import * as z from "zod";

const State = z.object({
  step: z.number(),
  messages: z.array(z.string()),
});

const workflow = new StateGraph(State)
  .addNode("step1", (state) => {
    console.log("Step 1 - Current:", state);
    return { step: 1, messages: ["processed in step 1"] };
  })
  .addNode("step2", (state) => {
    console.log("Step 2 - Current:", state);
    return { step: 2, messages: ["processed in step 2"] };
  })
  .addEdge(START, "step1")
  .addEdge("step1", "step2")
  .addEdge("step2", END);

const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });

const config = { configurable: { thread_id: "test-1" } };
console.log("Result:", await graph.invoke({ step: 0, messages: [] }, config));

// console.log(await graph.getState(config));

const config2 = { configurable: {
     thread_id: "test-1",
     checkpoint_id:"1f0f1082-66b3-6d40-8002-2be708cdab2c"
 } };
//  console.log(await graph.getState(config2));
 
//Get state history

for await (const state of graph.getStateHistory(config)) {
  console.log(state);
}
