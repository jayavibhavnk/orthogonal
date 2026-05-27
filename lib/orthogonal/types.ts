export interface OrthSearchResult {
  api: string;
  path: string;
  method?: string;
  description?: string;
  priceCents?: number;
  score?: number;
  verified?: boolean;
}

export interface OrthRunRequest {
  api: string;
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

export interface OrthClientResult<T = unknown> {
  ok: boolean;
  data?: T;
  priceCents?: number;
  requestId?: string;
  attempts: number;
  cacheHit: boolean;
  latencyMs: number;
  error?: string;
  errorCode?: string;
}

export type RetryEvent = {
  tool: string;
  attempt: number;
  reason: string;
  nextDelayMs: number;
};

export interface OrthCallOptions {
  chatId?: string;
  onRetry?: (event: RetryEvent) => void | Promise<void>;
  signal?: AbortSignal;
}
