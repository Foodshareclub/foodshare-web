import { Target } from "lucide-react";
import type { AudienceSegment } from "../types";
import { Badge } from "@/components/ui/badge";

export function SegmentCard({ segment }: { segment: AudienceSegment }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div
          className="rounded-lg p-2"
          style={{ backgroundColor: `${segment.color}20`, color: segment.color }}
        >
          <Target className="h-5 w-5" />
        </div>
        {segment.isSystem && (
          <Badge variant="outline" className="text-xs">
            System
          </Badge>
        )}
      </div>
      <h4 className="font-semibold mb-1">{segment.name}</h4>
      {segment.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{segment.description}</p>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <span className="text-lg font-semibold">{segment.cachedCount.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">subscribers</span>
      </div>
    </div>
  );
}
