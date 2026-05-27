import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlanCardData } from "@/lib/stream/protocol";
import { formatPrice } from "@/lib/orthogonal/format";

export function PlanCard({ plan }: { plan: PlanCardData }) {
  return (
    <Card className="border-muted bg-muted/20 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="font-medium text-foreground">Feasibility</div>
          <p className="text-muted-foreground">{plan.feasibility}</p>
        </div>
        <div>
          <div className="font-medium text-foreground">Process</div>
          <p className="whitespace-pre-wrap text-muted-foreground">{plan.process}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-foreground">Cost</div>
            <p className="text-muted-foreground">{formatPrice(plan.costCents)}</p>
          </div>
          <div>
            <div className="font-medium text-foreground">Total</div>
            <p className="text-muted-foreground">{formatPrice(plan.costCents)}</p>
          </div>
        </div>
        <div>
          <div className="font-medium text-foreground">What you'll get</div>
          <p className="text-muted-foreground">{plan.sampleOutput}</p>
        </div>
      </CardContent>
    </Card>
  );
}
