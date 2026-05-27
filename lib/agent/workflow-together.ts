import { createTogetherProvider } from "@/lib/agent/together";

/** Workflow-compatible Together model factory (mirrors @workflow/ai/openai). */
export function together(modelId: string) {
  return async () => {
    "use step";
    return createTogetherProvider().chat(modelId);
  };
}
