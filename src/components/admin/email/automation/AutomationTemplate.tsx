import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AutomationTemplate({
  name,
  description,
  trigger,
}: {
  name: string;
  description: string;
  trigger: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Zap className="h-4 w-4" />
        </div>
        <h4 className="font-medium">{name}</h4>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      <Badge variant="outline" className="text-xs">
        {trigger}
      </Badge>
    </div>
  );
}
