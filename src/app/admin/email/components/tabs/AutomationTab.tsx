"use client";

import { useState } from "react";
import { Search, Plus, Zap, Sparkles } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import { EmptyState } from "../shared/EmptyState";
import { AutomationCard } from "../automation/AutomationCard";
import { AutomationTemplate } from "../automation/AutomationTemplate";
import type { ActiveAutomation } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AutomationTab({ automations }: { automations: ActiveAutomation[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAutomations = automations.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Automation
        </Button>
      </div>

      {/* Automation Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAutomations.map((automation) => (
          <AutomationCard key={automation.id} automation={automation} />
        ))}
        {filteredAutomations.length === 0 && (
          <div className="col-span-full">
            <GlassCard className="p-12">
              <EmptyState
                icon={<Zap />}
                message="No automations yet"
                action={
                  <Button className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Automation
                  </Button>
                }
              />
            </GlassCard>
          </div>
        )}
      </div>

      {/* Automation Templates */}
      <GlassCard>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Quick Start Templates
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <AutomationTemplate
            name="Welcome Series"
            description="Onboard new subscribers with a 3-email sequence"
            trigger="On signup"
          />
          <AutomationTemplate
            name="Re-engagement"
            description="Win back inactive users after 30 days"
            trigger="Inactivity"
          />
          <AutomationTemplate
            name="Food Alert"
            description="Notify users when food is available nearby"
            trigger="New listing"
          />
        </div>
      </GlassCard>
    </div>
  );
}
