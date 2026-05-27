"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { ThinkingData } from "@/lib/stream/protocol";
import { cn } from "@/lib/utils";

export function ThinkingBlock({
  data,
  defaultOpen,
}: {
  data: ThinkingData;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(
    defaultOpen ?? data.status !== "done",
  );

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-muted-foreground"
      >
        <Sparkles
          className={cn(
            "size-3.5 shrink-0",
            data.status === "streaming" && "animate-pulse text-foreground/70",
          )}
        />
        <span className="font-medium text-foreground/80">Thinking</span>
        <ChevronDown
          className={cn(
            "ml-auto size-4 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {data.text}
        </div>
      ) : null}
    </div>
  );
}
