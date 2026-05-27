"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import type { ModelConfig } from "@/lib/agent/models";
import { ContextBar } from "@/components/chat/ctx-bar";

export function ModelPicker({
  models,
  selectedModelId,
  onChange,
  ctxUsed,
  ctxMax,
}: {
  models: ModelConfig[];
  selectedModelId: string;
  onChange: (modelId: string) => void;
  ctxUsed: number;
  ctxMax?: number;
}) {
  const selected =
    models.find((model) => model.id === selectedModelId) ?? models[0];

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Badge variant="secondary">#{selected.rank}</Badge>
                {selected.name}
              </span>
              <ChevronDown className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-80">
          {models.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onChange(model.id)}
              className="flex flex-col items-start gap-1 py-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary">#{model.rank}</Badge>
                <span className="font-medium">{model.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {(model.contextWindow / 1000).toFixed(0)}K ctx · $
                {model.inputPricePerM}/${model.outputPricePerM} per 1M ·{" "}
                {model.bestFor}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <ContextBar used={ctxUsed} max={ctxMax ?? selected.contextWindow} model={selected} />
    </div>
  );
}
