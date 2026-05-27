import { createOpenAI } from "@ai-sdk/openai";

export function createTogetherProvider() {
  return createOpenAI({
    baseURL: "https://api.together.xyz/v1",
    apiKey: process.env.TOGETHER_API_KEY,
    name: "together",
  });
}

export function togetherModel(modelId: string) {
  return createTogetherProvider().chat(modelId);
}
