"use client";

/**
 * AutomationBuilder - Visual email automation flow builder
 * Features:
 * - Visual step editor with drag-and-drop
 * - Step types: email, delay, condition
 * - Template selector
 * - Trigger configuration
 * - Preview mode
 */

import React, { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Clock,
  GitBranch,
  Plus,
  Trash2,
  ChevronRight,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Package,
  Heart,
  MapPin,
  Star,
  MessageCircle,
  Trophy,
  Users,
  Hand,
  Calendar,
  Zap,
  ArrowDown,
  Settings,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { AutomationStep, AutomationFlow, EmailTemplate } from "@/types/automations.types";
import { TRIGGER_TYPES } from "@/types/automations.types";
import {
  createAutomationFlow,
  updateAutomationFlow,
  createPresetAutomation,
} from "@/app/actions/automations";

// ============================================================================
// Types
// ============================================================================

interface AutomationBuilderProps {
  flow?: AutomationFlow;
  templates?: EmailTemplate[];
  onClose: () => void;
  onSave?: () => void;
}

type StepType = "email" | "delay" | "condition" | "action";

interface StepConfig {
  type: StepType;
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}

// ============================================================================
// Constants
// ============================================================================

const STEP_CONFIGS: Record<StepType, StepConfig> = {
  email: {
    type: "email",
    icon: <Mail className="h-4 w-4" />,
    label: "Send Email",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  delay: {
    type: "delay",
    icon: <Clock className="h-4 w-4" />,
    label: "Wait",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  condition: {
    type: "condition",
    icon: <GitBranch className="h-4 w-4" />,
    label: "Condition",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
  },
  action: {
    type: "action",
    icon: <Zap className="h-4 w-4" />,
    label: "Action",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
};

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  user_signup: <UserPlus className="h-4 w-4" />,
  first_listing: <Package className="h-4 w-4" />,
  first_share: <Heart className="h-4 w-4" />,
  inactivity: <Clock className="h-4 w-4" />,
  food_listed_nearby: <MapPin className="h-4 w-4" />,
  food_reserved: <CheckCircle className="h-4 w-4" />,
  food_collected: <Star className="h-4 w-4" />,
  message_received: <MessageCircle className="h-4 w-4" />,
  profile_incomplete: <AlertCircle className="h-4 w-4" />,
  milestone_reached: <Trophy className="h-4 w-4" />,
  segment_entry: <Users className="h-4 w-4" />,
  manual: <Hand className="h-4 w-4" />,
  scheduled: <Calendar className="h-4 w-4" />,
};

const DELAY_PRESETS = [
  { label: "1 hour", minutes: 60 },
  { label: "6 hours", minutes: 360 },
  { label: "1 day", minutes: 1440 },
  { label: "2 days", minutes: 2880 },
  { label: "3 days", minutes: 4320 },
  { label: "1 week", minutes: 10080 },
  { label: "2 weeks", minutes: 20160 },
  { label: "30 days", minutes: 43200 },
];

// ============================================================================
// Main Component
// ============================================================================

export function AutomationBuilder({
  flow,
  templates = [],
  onClose,
  onSave,
}: AutomationBuilderProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [name, setName] = useState(flow?.name || "");
  const [description, setDescription] = useState(flow?.description || "");
  const [triggerType, setTriggerType] = useState(flow?.trigger_type || "user_signup");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(
    flow?.trigger_config || {}
  );
  const [steps, setSteps] = useState<AutomationStep[]>(flow?.steps || []);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const isEditing = !!flow;

  const handleAddStep = (type: StepType): void => {
    const newStep: AutomationStep = {
      type,
      ...(type === "email" && { subject: "", content: "", template_slug: "" }),
      ...(type === "delay" && { delay_minutes: 1440 }),
      ...(type === "condition" && {
        condition: { field: "", operator: "equals", value: "" },
      }),
    };
    setSteps([...steps, newStep]);
    setSelectedStepIndex(steps.length);
  };

  const handleRemoveStep = (index: number): void => {
    setSteps(steps.filter((_, i) => i !== index));
    if (selectedStepIndex === index) {
      setSelectedStepIndex(null);
    } else if (selectedStepIndex !== null && selectedStepIndex > index) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
  };

  const handleUpdateStep = (index: number, updates: Partial<AutomationStep>): void => {
    setSteps(steps.map((step, i) => (i === index ? { ...step, ...updates } : step)));
  };

  const handleSave = (): void => {
    if (!name.trim()) {
      setResult({ success: false, message: "Please enter a name for the automation" });
      return;
    }
    if (steps.length === 0) {
      setResult({ success: false, message: "Please add at least one step" });
      return;
    }

    setResult(null);
    startTransition(async () => {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        steps,
      };

      const response = isEditing
        ? await updateAutomationFlow(flow.id, data)
        : await createAutomationFlow(data);

      if (response.success) {
        setResult({
          success: true,
          message: isEditing ? "Automation updated!" : "Automation created!",
        });
        onSave?.();
        setTimeout(() => onClose(), 1000);
      } else {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "Failed to save automation";
        setResult({ success: false, message: errorMsg });
      }
    });
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div>
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Automation" : "Create Automation"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Build automated email flows to engage your users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Flow Builder */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Automation Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Welcome Series"
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger">Trigger</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIGGER_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {TRIGGER_ICONS[key]}
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this automation does..."
                  rows={2}
                  className="bg-background/50 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Trigger Info */}
          <TriggerCard
            triggerType={triggerType}
            triggerConfig={triggerConfig}
            onConfigChange={setTriggerConfig}
          />

          {/* Flow Steps */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Automation Steps
                </CardTitle>
                <div className="flex items-center gap-1">
                  {(["email", "delay", "condition"] as StepType[]).map((type) => (
                    <Tooltip key={type}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => handleAddStep(type)}
                        >
                          <Plus className="h-3 w-3" />
                          {STEP_CONFIGS[type].icon}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add {STEP_CONFIGS[type].label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No steps yet</p>
                  <p className="text-sm">Add steps to build your automation flow</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <StepCard
                      key={index}
                      step={step}
                      index={index}
                      isSelected={selectedStepIndex === index}
                      onSelect={() => setSelectedStepIndex(index)}
                      onRemove={() => handleRemoveStep(index)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result Message */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-xl flex items-center gap-3",
                result.success
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400"
              )}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <p className="font-medium text-sm">{result.message}</p>
            </motion.div>
          )}
        </div>

        {/* Right Panel - Step Editor */}
        <div className="w-80 border-l border-border/50 bg-muted/20 overflow-y-auto">
          {selectedStepIndex !== null && steps[selectedStepIndex] ? (
            <StepEditor
              step={steps[selectedStepIndex]}
              index={selectedStepIndex}
              templates={templates}
              onUpdate={(updates) => handleUpdateStep(selectedStepIndex, updates)}
              onClose={() => setSelectedStepIndex(null)}
            />
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Step Editor</p>
              <p className="text-sm">Select a step to edit its details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Trigger Card Component
// ============================================================================

function TriggerCard({
  triggerType,
  triggerConfig,
  onConfigChange,
}: {
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}): React.ReactElement {
  const trigger = TRIGGER_TYPES[triggerType as keyof typeof TRIGGER_TYPES];

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-violet-500/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {TRIGGER_ICONS[triggerType] || <Zap className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{trigger?.label || "Unknown Trigger"}</p>
            <p className="text-xs text-muted-foreground">{trigger?.description}</p>

            {/* Trigger-specific config */}
            {triggerType === "inactivity" && (
              <div className="mt-3 flex items-center gap-2">
                <Label className="text-xs">Days inactive:</Label>
                <Input
                  type="number"
                  value={(triggerConfig.days_inactive as number) || 30}
                  onChange={(e) =>
                    onConfigChange({ ...triggerConfig, days_inactive: parseInt(e.target.value) })
                  }
                  className="w-20 h-8 text-sm"
                  min={1}
                />
              </div>
            )}
            {triggerType === "food_listed_nearby" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Radius (km):</Label>
                  <Input
                    type="number"
                    value={(triggerConfig.radius_km as number) || 5}
                    onChange={(e) =>
                      onConfigChange({ ...triggerConfig, radius_km: parseInt(e.target.value) })
                    }
                    className="w-16 h-8 text-sm"
                    min={1}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Max/day:</Label>
                  <Input
                    type="number"
                    value={(triggerConfig.max_per_day as number) || 3}
                    onChange={(e) =>
                      onConfigChange({ ...triggerConfig, max_per_day: parseInt(e.target.value) })
                    }
                    className="w-16 h-8 text-sm"
                    min={1}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Step Card Component
// ============================================================================

function StepCard({
  step,
  index,
  isSelected,
  onSelect,
  onRemove,
}: {
  step: AutomationStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}): React.ReactElement {
  const config = STEP_CONFIGS[step.type];

  const getStepSummary = (): string => {
    switch (step.type) {
      case "email":
        return step.subject || step.template_slug || "No subject set";
      case "delay":
        return formatDelay(step.delay_minutes || 0);
      case "condition":
        return step.condition
          ? `${step.condition.field} ${step.condition.operator} ${step.condition.value}`
          : "No condition set";
      default:
        return "";
    }
  };

  return (
    <div className="relative">
      {/* Connector line */}
      {index > 0 && <div className="absolute left-6 -top-2 w-0.5 h-2 bg-border" />}

      <motion.button
        layout
        onClick={onSelect}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
          isSelected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border/50 bg-background/50 hover:border-primary/30 hover:bg-muted/30"
        )}
      >
        {/* Step number & icon */}
        <div className={cn("p-2 rounded-lg", config.bgColor, config.color)}>{config.icon}</div>

        {/* Step info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Step {index + 1}
            </Badge>
            <span className="text-sm font-medium">{config.label}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{getStepSummary()}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove step</TooltipContent>
          </Tooltip>
        </div>

        {/* Selection indicator */}
        {isSelected && <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />}
      </motion.button>

      {/* Arrow to next step */}
      <div className="flex justify-center py-1">
        <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
      </div>
    </div>
  );
}

// ============================================================================
// Step Editor Component
// ============================================================================

function StepEditor({
  step,
  index,
  templates,
  onUpdate,
  onClose,
}: {
  step: AutomationStep;
  index: number;
  templates: EmailTemplate[];
  onUpdate: (updates: Partial<AutomationStep>) => void;
  onClose: () => void;
}): React.ReactElement {
  const config = STEP_CONFIGS[step.type];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", config.bgColor, config.color)}>{config.icon}</div>
          <div>
            <p className="font-medium text-sm">{config.label}</p>
            <p className="text-xs text-muted-foreground">Step {index + 1}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Email Step Editor */}
      {step.type === "email" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Template (optional)</Label>
            <Select
              value={step.template_slug || ""}
              onValueChange={(value) => onUpdate({ template_slug: value || undefined })}
            >
              <SelectTrigger className="bg-background/50 h-9 text-sm">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.slug} value={template.slug}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Subject Line</Label>
            <Input
              value={step.subject || ""}
              onChange={(e) => onUpdate({ subject: e.target.value })}
              placeholder="Email subject..."
              className="bg-background/50 h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Content Preview</Label>
            <Textarea
              value={step.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Email content (HTML supported)..."
              rows={6}
              className="bg-background/50 text-sm resize-none"
            />
          </div>
        </div>
      )}

      {/* Delay Step Editor */}
      {step.type === "delay" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Wait Duration</Label>
            <Select
              value={String(step.delay_minutes || 1440)}
              onValueChange={(value) => onUpdate({ delay_minutes: parseInt(value) })}
            >
              <SelectTrigger className="bg-background/50 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELAY_PRESETS.map((preset) => (
                  <SelectItem key={preset.minutes} value={String(preset.minutes)}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Or custom (minutes)</Label>
            <Input
              type="number"
              value={step.delay_minutes || 1440}
              onChange={(e) => onUpdate({ delay_minutes: parseInt(e.target.value) })}
              className="bg-background/50 h-9 text-sm"
              min={1}
            />
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <Clock className="h-3 w-3 inline mr-1" />
              User will wait {formatDelay(step.delay_minutes || 0)} before the next step
            </p>
          </div>
        </div>
      )}

      {/* Condition Step Editor */}
      {step.type === "condition" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Field</Label>
            <Select
              value={step.condition?.field || ""}
              onValueChange={(value) =>
                onUpdate({
                  condition: {
                    ...step.condition,
                    field: value,
                    operator: step.condition?.operator || "equals",
                    value: step.condition?.value || "",
                  },
                })
              }
            >
              <SelectTrigger className="bg-background/50 h-9 text-sm">
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_seen_at">Last seen</SelectItem>
                <SelectItem value="email_opened">Email opened</SelectItem>
                <SelectItem value="profile_complete">Profile complete</SelectItem>
                <SelectItem value="has_listings">Has listings</SelectItem>
                <SelectItem value="total_shares">Total shares</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Operator</Label>
            <Select
              value={step.condition?.operator || "equals"}
              onValueChange={(value) =>
                onUpdate({
                  condition: {
                    ...step.condition,
                    field: step.condition?.field || "",
                    operator: value,
                    value: step.condition?.value || "",
                  },
                })
              }
            >
              <SelectTrigger className="bg-background/50 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not equals</SelectItem>
                <SelectItem value="greater_than">Greater than</SelectItem>
                <SelectItem value="less_than">Less than</SelectItem>
                <SelectItem value="older_than">Older than</SelectItem>
                <SelectItem value="newer_than">Newer than</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Value</Label>
            <Input
              value={String(step.condition?.value || "")}
              onChange={(e) =>
                onUpdate({
                  condition: {
                    ...step.condition,
                    field: step.condition?.field || "",
                    operator: step.condition?.operator || "equals",
                    value: e.target.value,
                  },
                })
              }
              placeholder="Value..."
              className="bg-background/50 h-9 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  if (minutes < 10080) {
    const days = Math.floor(minutes / 1440);
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
  const weeks = Math.floor(minutes / 10080);
  return `${weeks} week${weeks !== 1 ? "s" : ""}`;
}

// ============================================================================
// Preset Automation Creator Component
// ============================================================================

interface PresetAutomationCreatorProps {
  onCreated: () => void;
}

export function PresetAutomationCreator({
  onCreated,
}: PresetAutomationCreatorProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [creatingPreset, setCreatingPreset] = useState<string | null>(null);

  const handleCreatePreset = (preset: "welcome" | "reengagement" | "food_alert"): void => {
    setCreatingPreset(preset);
    startTransition(async () => {
      const result = await createPresetAutomation(preset);
      if (result.success) {
        onCreated();
      }
      setCreatingPreset(null);
    });
  };

  const presets = [
    {
      id: "welcome" as const,
      name: "Welcome Series",
      description: "Onboard new subscribers with a 3-email sequence",
      trigger: "On signup",
      icon: <UserPlus className="h-5 w-5" />,
      color: "emerald",
    },
    {
      id: "reengagement" as const,
      name: "Re-engagement",
      description: "Win back inactive users after 30 days",
      trigger: "Inactivity",
      icon: <Clock className="h-5 w-5" />,
      color: "amber",
    },
    {
      id: "food_alert" as const,
      name: "Food Alert",
      description: "Notify users when food is available nearby",
      trigger: "New listing",
      icon: <Heart className="h-5 w-5" />,
      color: "rose",
    },
  ];

  const colorClasses = {
    emerald:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
    amber:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => handleCreatePreset(preset.id)}
          disabled={isPending}
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl border transition-all text-left group disabled:opacity-50",
            colorClasses[preset.color as keyof typeof colorClasses]
          )}
        >
          <div className="p-2 rounded-lg bg-current/10">
            {creatingPreset === preset.id ? (
              <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              preset.icon
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{preset.name}</p>
            <p className="text-xs opacity-80 line-clamp-2 mt-0.5">{preset.description}</p>
            <Badge variant="secondary" className="mt-2 text-[10px]">
              <Zap className="h-3 w-3 mr-1" />
              {preset.trigger}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}
