"use client";

/**
 * SegmentCard - Audience segment display card
 */

import { Users, MoreVertical, Eye, Edit, Send } from "lucide-react";
import type { AudienceSegment } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SegmentCardProps {
  segment: AudienceSegment;
}

export function SegmentCard({ segment }: SegmentCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${segment.color}20`, color: segment.color }}
          >
            <Users className="h-4 w-4" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Members
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Send className="h-4 w-4 mr-2" />
                Send Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h4 className="font-semibold text-sm mb-1">{segment.name}</h4>
        {segment.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{segment.description}</p>
        )}
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold tabular-nums">{segment.cachedCount.toLocaleString()}</p>
          <Badge variant="secondary" className="text-xs">
            {segment.isSystem ? "System" : "Custom"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
