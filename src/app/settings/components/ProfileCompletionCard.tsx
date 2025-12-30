"use client";

import Link from "next/link";
import { TrendingUp, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { Glass } from "@/components/ui/glass";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function ProfileCompletionCard() {
  // Mock data - in real app, this would come from server
  const completionItems = [
    { label: "Profile photo", completed: true },
    { label: "Phone number", completed: false },
    { label: "Address", completed: false },
    { label: "Email verified", completed: true },
  ];

  const completedCount = completionItems.filter((i) => i.completed).length;
  const percentage = Math.round((completedCount / completionItems.length) * 100);

  return (
    <Glass variant="subtle" hover className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Profile Completion</span>
        </div>
        <span className="text-sm font-semibold text-primary">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2 mb-4" />
      <div className="space-y-2">
        {completionItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            {item.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/40" />
            )}
            <span className={cn(item.completed ? "text-muted-foreground" : "text-foreground")}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/settings/personal-info"
        className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        Complete your profile
        <ChevronRight className="w-3 h-3" />
      </Link>
    </Glass>
  );
}
