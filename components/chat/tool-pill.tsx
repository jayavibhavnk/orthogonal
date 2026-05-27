"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { ToolCallData } from "@/lib/stream/protocol";
import { formatPrice } from "@/lib/orthogonal/format";

export function ToolPill({ data }: { data: ToolCallData }) {
  const Icon =
    data.status === "running" || data.status === "starting"
      ? Loader2
      : data.status === "error"
        ? AlertCircle
        : CheckCircle2;

  return (
    <Collapsible>
      <CollapsibleTrigger className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted/70">
        <Icon
          className={`size-3.5 ${data.status === "running" || data.status === "starting" ? "animate-spin" : ""}`}
        />
        <span>{data.label}</span>
        <ChevronRight className="size-3.5" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 rounded-xl border bg-card p-3 text-xs text-muted-foreground">
        <div className="space-y-1">
          <div>Tool: {data.name}</div>
          {data.requestId && <div>Request ID: {data.requestId}</div>}
          {data.priceCents != null && (
            <div>Cost: {formatPrice(data.priceCents)}</div>
          )}
          {data.latencyMs != null && <div>Latency: {data.latencyMs}ms</div>}
          {data.args != null && (
            <pre className="mt-2 overflow-auto rounded bg-muted p-2">
              {JSON.stringify(data.args, null, 2)}
            </pre>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function RetryBanner({
  tool,
  attempt,
  reason,
}: {
  tool: string;
  attempt: number;
  reason: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <Loader2 className="size-4 animate-spin" />
      <span>
        Retrying {tool}… ({attempt}/3) — {reason}
      </span>
    </div>
  );
}

export function ArtifactChip({
  summary,
  id,
}: {
  summary: string;
  id: string;
}) {
  return (
    <Badge variant="secondary" className="rounded-full font-normal">
      {summary} · {id.slice(0, 8)}
    </Badge>
  );
}
