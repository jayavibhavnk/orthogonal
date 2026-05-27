"use client";

import type { ModelConfig } from "@/lib/agent/models";

export function ContextBar({
  used,
  max,
  model,
}: {
  used: number;
  max: number;
  model: ModelConfig;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{model.name}</span>
        <span>
          {(used / 1000).toFixed(1)}K / {(max / 1000).toFixed(0)}K ·{" "}
          {percent < 1 && used > 0 ? "<1" : percent}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-300"
          style={{ width: `${Math.max(used > 0 ? 2 : 0, percent)}%` }}
        />
      </div>
    </div>
  );
}
