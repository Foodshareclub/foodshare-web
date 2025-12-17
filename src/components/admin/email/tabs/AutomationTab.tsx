"use client";

/**
 * AutomationTab - Automation flows management with builder
 */

import React, { useState, lazy, Suspense } from "react";
import { Search, Plus, Zap, Sparkles } from "lucide-react";
import { EmptyState } from "../components";
import { AutomationCardEnhanced, QueueControlCard } from "../cards";
import type { AutomationTabProps } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

import { refreshEmailDashboard } from "@/app/actions/campaigns";

// Lazy load heavy components
const AutomationBuilderLazy = lazy(() =>
  import("../AutomationBuilder").then((mod) => ({ default: mod.AutomationBuilder }))
);

const PresetAutomationCreatorLazy = lazy(() =>
  import("../AutomationBuilder").then((mod) => ({ default: mod.PresetAutomationCreator }))
);

export function AutomationTab({ automations }: AutomationTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingFlow, setEditingFlow] = useState<AutomationTabProps["automations"][0] | null>(null);

  const filteredAutomations = automations.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = (): void => {
    refreshEmailDashboard();
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/50"
          />
        </div>
        <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              New Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-96">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <AutomationBuilderLazy
                flow={
                  editingFlow
                    ? {
                        id: editingFlow.id,
                        name: editingFlow.name,
                        description: null,
                        trigger_type: editingFlow.triggerType,
                        trigger_config: {},
                        status: editingFlow.status,
                        steps: [],
                        total_enrolled: editingFlow.totalEnrolled,
                        total_completed: editingFlow.totalCompleted,
                        total_converted: 0,
                        conversion_goal: null,
                        created_by: null,
                        created_at: "",
                        updated_at: "",
                      }
                    : undefined
                }
                onClose={() => {
                  setShowBuilder(false);
                  setEditingFlow(null);
                }}
                onSave={handleRefresh}
              />
            </Suspense>
          </DialogContent>
        </Dialog>
      </div>

      {/* Automation Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAutomations.map((automation) => (
          <AutomationCardEnhanced
            key={automation.id}
            automation={automation}
            onEdit={() => {
              setEditingFlow(automation);
              setShowBuilder(true);
            }}
          />
        ))}
        {filteredAutomations.length === 0 && (
          <div className="col-span-full">
            <Card className="p-12 bg-card/50">
              <EmptyState
                icon={<Zap className="h-10 w-10" />}
                title="No automations yet"
                description="Create automated email flows to engage your users"
                action={
                  <Button className="mt-4 gap-2" onClick={() => setShowBuilder(true)}>
                    <Plus className="h-4 w-4" />
                    Create Automation
                  </Button>
                }
              />
            </Card>
          </div>
        )}
      </div>

      {/* Quick Start Templates */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Quick Start Templates
          </CardTitle>
          <CardDescription>Pre-built automation flows to get you started</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Suspense
            fallback={
              <div className="h-32 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <PresetAutomationCreatorLazy onCreated={handleRefresh} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Queue Control */}
      <QueueControlCard onRefresh={handleRefresh} />
    </div>
  );
}
