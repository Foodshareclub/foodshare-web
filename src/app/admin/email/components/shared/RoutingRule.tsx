import { Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function RoutingRule({
  condition,
  action,
  priority,
}: {
  condition: string;
  action: string;
  priority: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="text-xs">
          {priority}
        </Badge>
        <div>
          <p className="text-sm font-medium">{condition}</p>
          <p className="text-xs text-muted-foreground">→ {action}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );
}
