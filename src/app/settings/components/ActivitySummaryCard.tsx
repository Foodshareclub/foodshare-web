"use client";

import { Heart, MessageSquare, Clock, Sparkles } from "lucide-react";
import { Glass } from "@/components/ui/glass";

export function ActivitySummaryCard() {
  // Mock data
  const stats = [
    { label: "Items shared", value: "12", icon: Heart },
    { label: "Messages", value: "48", icon: MessageSquare },
    { label: "Days active", value: "23", icon: Clock },
  ];

  return (
    <Glass variant="subtle" hover className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium">Your Activity</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-muted/50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}
