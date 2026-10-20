/**
 * Zod Validation Schemas
 * All schema definitions for automation server actions
 */

import { z } from "zod";

export const AutomationStepSchema = z.object({
  type: z.enum(["email", "delay", "condition", "action"]),
  delay_minutes: z.number().min(0).optional(),
  template_slug: z.string().optional(),
  subject: z.string().max(200).optional(),
  content: z.string().optional(),
  condition: z
    .object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown(),
    })
    .optional(),
});

export const CreateAutomationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  trigger_type: z.string().min(1, "Trigger type is required"),
  trigger_config: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(AutomationStepSchema).optional(),
});

export const UpdateAutomationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  trigger_type: z.string().optional(),
  trigger_config: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(AutomationStepSchema).optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
});

export const EmailTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  subject: z.string().min(1, "Subject is required").max(200),
  html_content: z.string().min(1, "Content is required"),
  plain_text_content: z.string().optional(),
  category: z.enum(["automation", "transactional", "marketing", "system"]).optional(),
  variables: z.array(z.string()).optional(),
});
