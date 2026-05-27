"use client";

import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  status,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  status?: "submitted" | "streaming" | "ready" | "error";
}) {
  return (
    <div className="relative rounded-2xl border bg-background p-2 shadow-sm">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={status === "streaming" ? "Assistant is responding…" : "Reply..."}
        className="min-h-[56px] resize-none border-0 bg-transparent pr-14 shadow-none focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <Button
        size="icon"
        className="absolute bottom-3 right-3 rounded-full"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
      >
        <ArrowUp className="size-4" />
      </Button>
    </div>
  );
}
