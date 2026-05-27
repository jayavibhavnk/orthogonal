"use client";

import { cn } from "@/lib/utils";

export function StreamingIndicator({
  label = "Generating response",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground",
        className,
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-foreground/70" />
      </span>
      <span>{label}</span>
      <span className="inline-flex gap-1" aria-hidden>
        <span className="animate-bounce [animation-delay:0ms]">.</span>
        <span className="animate-bounce [animation-delay:150ms]">.</span>
        <span className="animate-bounce [animation-delay:300ms]">.</span>
      </span>
    </div>
  );
}
