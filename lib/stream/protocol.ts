export type PlanCardData = {
  feasibility: string;
  process: string;
  costCents: number;
  sampleOutput: string;
};

export type ToolCallData = {
  name: string;
  label: string;
  status: "starting" | "running" | "done" | "error";
  latencyMs?: number;
  priceCents?: number;
  requestId?: string;
  args?: unknown;
  resultPreview?: string;
};

export type RetryData = {
  tool: string;
  attempt: number;
  reason: string;
  nextDelayMs: number;
};

export type ArtifactData = {
  id: string;
  summary: string;
  tokenEstimate: number;
};

export type ContextData = {
  used: number;
  max: number;
  modelId: string;
  fillPercent: number;
};

export type FollowUpData = {
  suggestions: string[];
};

export type ThinkingData = {
  text: string;
  status: "streaming" | "done";
};

export const STREAM_DATA_TYPES = {
  planCard: "data-plan-card",
  toolCall: "data-tool-call",
  retry: "data-retry",
  artifact: "data-artifact",
  ctx: "data-ctx",
  followups: "data-followups",
  thinking: "data-thinking",
} as const;
