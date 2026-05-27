export type ModelTier = "frontier" | "strong" | "fast" | "cheap";

export interface ModelConfig {
  id: string;
  name: string;
  rank: number;
  contextWindow: number;
  inputPricePerM: number;
  outputPricePerM: number;
  tier: ModelTier;
  description: string;
  bestFor: string;
  supportsTools: boolean;
}

export const DEFAULT_MODEL_ID = "zai-org/GLM-5.1";
export const EXECUTOR_MODEL_ID = "meta-llama/Llama-3.3-70B-Instruct-Turbo";
export const COMPACTOR_MODEL_ID = "meta-llama/Llama-3.3-70B-Instruct-Turbo";

export const MODEL_CATALOG: ModelConfig[] = [
  {
    id: "zai-org/GLM-5.1",
    name: "GLM 5.1",
    rank: 1,
    contextWindow: 200_000,
    inputPricePerM: 1.4,
    outputPricePerM: 4.4,
    tier: "frontier",
    description: "Best overall planner for multi-step tool orchestration.",
    bestFor: "Default planner",
    supportsTools: true,
  },
  {
    id: "moonshotai/Kimi-K2.6",
    name: "Kimi K2.6",
    rank: 2,
    contextWindow: 200_000,
    inputPricePerM: 1.2,
    outputPricePerM: 4.5,
    tier: "frontier",
    description: "Frontier alternative with strong reasoning.",
    bestFor: "Frontier alt",
    supportsTools: true,
  },
  {
    id: "MiniMaxAI/MiniMax-M2.7",
    name: "MiniMax M2.7",
    rank: 3,
    contextWindow: 200_000,
    inputPricePerM: 0.3,
    outputPricePerM: 1.2,
    tier: "cheap",
    description: "Best cost/performance for long tool loops.",
    bestFor: "Best $/perf",
    supportsTools: true,
  },
  {
    id: "moonshotai/Kimi-K2.5",
    name: "Kimi K2.5",
    rank: 4,
    contextWindow: 256_000,
    inputPricePerM: 0.5,
    outputPricePerM: 2.8,
    tier: "strong",
    description: "Large context for deep sequential tool use.",
    bestFor: "Deep tool loops",
    supportsTools: true,
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    name: "Llama 3.3 70B",
    rank: 5,
    contextWindow: 128_000,
    inputPricePerM: 0.88,
    outputPricePerM: 0.88,
    tier: "fast",
    description: "Fast executor for sub-agents. Weaker at multi-step tool orchestration — prefer GLM 5.1 as planner.",
    bestFor: "Sub-agent executor",
    supportsTools: true,
  },
];

export function getModelConfig(modelId: string): ModelConfig {
  return (
    MODEL_CATALOG.find((m) => m.id === modelId) ??
    MODEL_CATALOG[0]
  );
}
