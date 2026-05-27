"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FollowUps({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (text: string) => void;
}) {
  if (!suggestions.length) return null;

  return (
    <Card className="border-muted bg-muted/10 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Follow up
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/60"
          >
            {index + 1}. {suggestion}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
