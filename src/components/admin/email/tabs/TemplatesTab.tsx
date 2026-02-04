"use client";

/**
 * TemplatesTab - Email Template Management
 *
 * Features:
 * - Template listing with category grouping
 * - Version tracking
 * - Active/Inactive status
 */

import { motion } from "framer-motion";
import {
  FileText,
  Zap,
  Mail,
  Megaphone,
  Settings,
  Newspaper,
  CheckCircle2,
  XCircle,
  Edit,
  Copy,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EmailTemplate } from "@/lib/data/admin-email";

interface TemplatesTabProps {
  templates: EmailTemplate[];
}

const CATEGORY_CONFIG = {
  automation: {
    icon: Zap,
    label: "Automation",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  transactional: {
    icon: Mail,
    label: "Transactional",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  marketing: {
    icon: Megaphone,
    label: "Marketing",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
  },
  system: {
    icon: Settings,
    label: "System",
    color: "text-slate-500",
    bg: "bg-slate-50 dark:bg-slate-950/30",
    border: "border-slate-200 dark:border-slate-800",
  },
  digest: {
    icon: Newspaper,
    label: "Digest",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
  },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function TemplatesTab({ templates }: TemplatesTabProps) {
  // Group templates by category
  const groupedTemplates = templates.reduce(
    (acc, template) => {
      const cat = template.category || "transactional";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(template);
      return acc;
    },
    {} as Record<string, EmailTemplate[]>
  );

  const categories = Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>;

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted/50 p-4 mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Email templates help you create consistent, professional emails. Create your first
          template to get started.
        </p>
        <Button className="mt-4">
          <FileText className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Email Templates</h2>
          <p className="text-sm text-muted-foreground">
            {templates.length} templates across {Object.keys(groupedTemplates).length} categories
          </p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Category Sections */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {categories.map((category) => {
          const categoryTemplates = groupedTemplates[category];
          if (!categoryTemplates || categoryTemplates.length === 0) return null;

          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;

          return (
            <motion.div key={category} variants={item}>
              <Card className={cn("border", config.border)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("rounded-lg p-2", config.bg)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{config.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {categoryTemplates.length} template
                        {categoryTemplates.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border/50">
                    {categoryTemplates.map((template) => (
                      <TemplateRow key={template.id} template={template} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function TemplateRow({ template }: { template: EmailTemplate }) {
  return (
    <div className="flex items-center justify-between py-3 group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{template.name}</span>
            {template.isActive ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate">{template.subject}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <Badge variant="outline" className="text-[10px] px-1.5">
          v{template.version}
        </Badge>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
