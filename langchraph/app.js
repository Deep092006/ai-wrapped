/**
 * ✍️ Multi-Platform Content Generation Graph
 * Routes user requests and generates LinkedIn or Instagram posts
 * with review & improvement loop using LangGraph
 */

import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { ollama } from "../app.js";

// 🔀 Decide which platform post to generate
function routePostByPlatform(state) {
  const userInput =
    state.messages.find(msg => msg.role === "user")?.content || "";

  if (userInput.toLowerCase().includes("insta")) {
    return "generateInstagramPost";
  }

  return "generateLinkedInPost";
}

// 💼 Generate LinkedIn post
async function generateLinkedInPost(state) {
  const promptWithInstruction = [
    ...state.messages,
    {
      role: "system",
      content:
        "Generate a high-quality, professional LinkedIn post based on the user's request.",
    },
  ];

  const modelResponse = await ollama.invoke(promptWithInstruction);

  return {
    messages: [...state.messages, modelResponse],
  };
}

// 📸 Generate Instagram post
async function generateInstagramPost(state) {
  const promptWithInstruction = [
    ...state.messages,
    {
      role: "system",
      content:
        "Generate a creative, short, and catchy Instagram post based on the user's request.",
    },
  ];

  const modelResponse = await ollama.invoke(promptWithInstruction);

  return {
    messages: [...state.messages, modelResponse],
  };
}

// 🧐 Review generated content for mistakes & improvements
async function reviewContent(state) {
  console.log(
    "Reviewing content. Total messages so far:",
    state.messages.length
  );

  const reviewPrompt = [
    ...state.messages,
    {
      role: "system",
      content:
        "Review the above content and suggest grammar fixes, clarity improvements, or better phrasing.",
    },
  ];

  const reviewResponse = await ollama.invoke(reviewPrompt);

  // Add review feedback back into conversation
  return {
    messages: [
      ...state.messages,
      { role: "user", content: reviewResponse.content },
    ],
  };
}

// 🔁 Decide whether to continue improving or finish
function decideNextStep(state) {
  if (state.messages.length > 5) {
    return "finalize";
  }

  return "generateLinkedInPost";
}

// ✅ Final node (end of workflow)
async function finalize(state) {
  console.log("Final conversation state:", state.messages);
  return {};
}

// 🧠 Build LangGraph workflow
const graph = new StateGraph(MessagesAnnotation)
  .addNode("generateLinkedInPost", generateLinkedInPost)
  .addNode("generateInstagramPost", generateInstagramPost)
  .addNode("reviewContent", reviewContent)
  .addNode("finalize", finalize)

  // Start by routing based on user intent
  .addConditionalEdges(START, routePostByPlatform)

  // Content → Review
  .addEdge("generateLinkedInPost", "reviewContent")
  .addEdge("generateInstagramPost", "reviewContent")

  // Review → Loop or Finish
  .addConditionalEdges("reviewContent", decideNextStep)

  // Finish
  .addEdge("finalize", END)
  .compile();

// ▶️ Run graph
await graph.invoke({
  messages: [
    {
      role: "system",
      content: "You are a content specialist who generates social media posts.",
    },
    {
      role: "user",
      content: "create insta post about ai vs ml",
    },
  ],
});
