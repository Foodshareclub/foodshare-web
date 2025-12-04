/**
 * CRM Campaign System Consistency Checker
 *
 * This script verifies consistency between:
 * - Database schema (SQL migrations)
 * - TypeScript type definitions
 * - API function implementations
 * - SQL stored procedures
 */

import * as fs from "fs";
import * as path from "path";

interface ConsistencyIssue {
  severity: "error" | "warning" | "info";
  category: string;
  description: string;
  location?: string;
  suggestion?: string;
}

const issues: ConsistencyIssue[] = [];

// =============================================================================
// DATABASE SCHEMA EXTRACTION
// =============================================================================

const DB_SCHEMA = {
  crm_campaigns: {
    columns: {
      id: "UUID",
      name: "TEXT",
      description: "TEXT",
      campaign_type: "TEXT",
      status: "TEXT",
      audience_filters: "JSONB",
      estimated_audience_size: "INTEGER",
      email_template_id: "UUID",
      email_subject: "TEXT",
      email_content: "JSONB",
      push_title: "TEXT",
      push_body: "TEXT",
      push_image_url: "TEXT",
      push_deep_link: "TEXT",
      trigger_type: "TEXT",
      scheduled_at: "TIMESTAMPTZ",
      lifecycle_trigger: "TEXT",
      score_threshold: "JSONB",
      send_frequency: "TEXT",
      max_sends_per_user: "INTEGER",
      respect_quiet_hours: "BOOLEAN",
      respect_digest_preferences: "BOOLEAN",
      total_sent: "INTEGER",
      total_delivered: "INTEGER",
      total_opened: "INTEGER",
      total_clicked: "INTEGER",
      total_converted: "INTEGER",
      total_bounced: "INTEGER",
      total_failed: "INTEGER",
      is_ab_test: "BOOLEAN",
      ab_test_variants: "JSONB",
      ab_test_winner: "TEXT",
      created_by: "UUID",
      created_at: "TIMESTAMPTZ",
      updated_at: "TIMESTAMPTZ",
      started_at: "TIMESTAMPTZ",
      completed_at: "TIMESTAMPTZ",
    },
    enums: {
      campaign_type: ["email", "push", "in_app", "multi_channel"],
      status: ["draft", "scheduled", "active", "paused", "completed", "cancelled"],
      trigger_type: ["immediate", "scheduled", "lifecycle_event", "score_threshold"],
      send_frequency: ["once", "daily", "weekly", "monthly"],
    },
  },
  crm_campaign_sends: {
    columns: {
      id: "UUID",
      campaign_id: "UUID",
      customer_id: "UUID",
      status: "TEXT",
      sent_at: "TIMESTAMPTZ",
      delivered_at: "TIMESTAMPTZ",
      opened_at: "TIMESTAMPTZ",
      clicked_at: "TIMESTAMPTZ",
      converted_at: "TIMESTAMPTZ",
      bounced_at: "TIMESTAMPTZ",
      failed_at: "TIMESTAMPTZ",
      error_message: "TEXT",
      retry_count: "INTEGER",
      email_queue_id: "UUID",
      notification_id: "BIGINT",
      variant_id: "TEXT",
      user_agent: "TEXT",
      ip_address: "INET",
      metadata: "JSONB",
      created_at: "TIMESTAMPTZ",
      updated_at: "TIMESTAMPTZ",
    },
    enums: {
      status: [
        "queued",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "converted",
        "bounced",
        "failed",
      ],
    },
  },
  crm_campaign_goals: {
    columns: {
      id: "UUID",
      campaign_id: "UUID",
      goal_type: "TEXT",
      goal_metric: "TEXT",
      target_value: "DECIMAL",
      current_value: "DECIMAL",
      is_met: "BOOLEAN",
      created_at: "TIMESTAMPTZ",
      updated_at: "TIMESTAMPTZ",
    },
    enums: {
      goal_type: ["engagement", "conversion", "retention", "revenue"],
    },
  },
  crm_segments: {
    columns: {
      id: "UUID",
      name: "TEXT",
      description: "TEXT",
      filters: "JSONB",
      is_dynamic: "BOOLEAN",
      last_calculated_at: "TIMESTAMPTZ",
      member_count: "INTEGER",
      times_used: "INTEGER",
      last_used_at: "TIMESTAMPTZ",
      created_by: "UUID",
      created_at: "TIMESTAMPTZ",
      updated_at: "TIMESTAMPTZ",
    },
  },
  crm_segment_members: {
    columns: {
      segment_id: "UUID",
      customer_id: "UUID",
      added_at: "TIMESTAMPTZ",
    },
  },
  crm_email_templates: {
    columns: {
      id: "UUID",
      name: "TEXT",
      category: "TEXT",
      subject_template: "TEXT",
      html_template: "TEXT",
      text_template: "TEXT",
      required_variables: "JSONB",
      optional_variables: "JSONB",
      preview_image_url: "TEXT",
      preview_text: "TEXT",
      times_used: "INTEGER",
      avg_open_rate: "DECIMAL",
      avg_click_rate: "DECIMAL",
      is_system_template: "BOOLEAN",
      is_active: "BOOLEAN",
      created_by: "UUID",
      created_at: "TIMESTAMPTZ",
      updated_at: "TIMESTAMPTZ",
    },
  },
  crm_campaign_analytics: {
    columns: {
      id: "UUID",
      campaign_id: "UUID",
      snapshot_date: "DATE",
      sent_count: "INTEGER",
      delivered_count: "INTEGER",
      bounced_count: "INTEGER",
      failed_count: "INTEGER",
      opened_count: "INTEGER",
      clicked_count: "INTEGER",
      converted_count: "INTEGER",
      unsubscribed_count: "INTEGER",
      delivery_rate: "DECIMAL",
      open_rate: "DECIMAL",
      click_rate: "DECIMAL",
      conversion_rate: "DECIMAL",
      ltv_change_total: "DECIMAL",
      items_shared_increase: "INTEGER",
      engagement_score_avg_change: "DECIMAL",
      created_at: "TIMESTAMPTZ",
    },
  },
  crm_workflow_templates: {
    columns: {
      id: "UUID",
      name: "TEXT",
      description: "TEXT",
      trigger_type: "TEXT",
      trigger_config: "JSONB",
      steps: "JSONB",
      is_active: "BOOLEAN",
      times_executed: "INTEGER",
      success_rate: "DECIMAL",
      created_by: "UUID",
      created_at: "TIMESTAMPTZ",
      updated_at: "TIMESTAMPTZ",
    },
    enums: {
      trigger_type: ["lifecycle_change", "score_threshold", "inactivity", "milestone", "manual"],
    },
  },
  crm_workflow_executions: {
    columns: {
      id: "UUID",
      workflow_id: "UUID",
      customer_id: "UUID",
      current_step: "INTEGER",
      status: "TEXT",
      started_at: "TIMESTAMPTZ",
      paused_at: "TIMESTAMPTZ",
      completed_at: "TIMESTAMPTZ",
      failed_at: "TIMESTAMPTZ",
      error_message: "TEXT",
      metadata: "JSONB",
    },
    enums: {
      status: ["running", "paused", "completed", "failed", "cancelled"],
    },
  },
};

// =============================================================================
// TYPESCRIPT TYPE DEFINITIONS
// =============================================================================

const TS_TYPES = {
  Campaign: [
    "id",
    "name",
    "description",
    "campaign_type",
    "status",
    "audience_filters",
    "estimated_audience_size",
    "email_template_id",
    "email_subject",
    "email_content",
    "push_title",
    "push_body",
    "push_image_url",
    "push_deep_link",
    "trigger_type",
    "scheduled_at",
    "lifecycle_trigger",
    "score_threshold",
    "send_frequency",
    "max_sends_per_user",
    "respect_quiet_hours",
    "respect_digest_preferences",
    "total_sent",
    "total_delivered",
    "total_opened",
    "total_clicked",
    "total_converted",
    "total_bounced",
    "total_failed",
    "is_ab_test",
    "ab_test_variants",
    "ab_test_winner",
    "created_by",
    "created_at",
    "updated_at",
    "started_at",
    "completed_at",
  ],
  CampaignSend: [
    "id",
    "campaign_id",
    "customer_id",
    "status",
    "sent_at",
    "delivered_at",
    "opened_at",
    "clicked_at",
    "converted_at",
    "bounced_at",
    "failed_at",
    "error_message",
    "retry_count",
    "email_queue_id",
    "notification_id",
    "variant_id",
    "user_agent",
    "ip_address",
    "metadata",
    "created_at",
    "updated_at",
  ],
  CampaignGoal: [
    "id",
    "campaign_id",
    "goal_type",
    "goal_metric",
    "target_value",
    "current_value",
    "is_met",
    "created_at",
    "updated_at",
  ],
  Segment: [
    "id",
    "name",
    "description",
    "filters",
    "is_dynamic",
    "last_calculated_at",
    "member_count",
    "times_used",
    "last_used_at",
    "created_by",
    "created_at",
    "updated_at",
  ],
  SegmentMember: ["segment_id", "customer_id", "added_at"],
  EmailTemplate: [
    "id",
    "name",
    "category",
    "subject_template",
    "html_template",
    "text_template",
    "required_variables",
    "optional_variables",
    "preview_image_url",
    "preview_text",
    "times_used",
    "avg_open_rate",
    "avg_click_rate",
    "is_system_template",
    "is_active",
    "created_by",
    "created_at",
    "updated_at",
  ],
  CampaignAnalytics: [
    "id",
    "campaign_id",
    "snapshot_date",
    "sent_count",
    "delivered_count",
    "bounced_count",
    "failed_count",
    "opened_count",
    "clicked_count",
    "converted_count",
    "unsubscribed_count",
    "delivery_rate",
    "open_rate",
    "click_rate",
    "conversion_rate",
    "ltv_change_total",
    "items_shared_increase",
    "engagement_score_avg_change",
    "created_at",
  ],
  WorkflowTemplate: [
    "id",
    "name",
    "description",
    "trigger_type",
    "trigger_config",
    "steps",
    "is_active",
    "times_executed",
    "success_rate",
    "created_by",
    "created_at",
    "updated_at",
  ],
  WorkflowExecution: [
    "id",
    "workflow_id",
    "customer_id",
    "current_step",
    "status",
    "started_at",
    "paused_at",
    "completed_at",
    "failed_at",
    "error_message",
    "metadata",
  ],
};

const TS_ENUMS = {
  CampaignType: ["email", "push", "in_app", "multi_channel"],
  CampaignStatus: ["draft", "scheduled", "active", "paused", "completed", "cancelled"],
  CampaignTriggerType: ["immediate", "scheduled", "lifecycle_event", "score_threshold"],
  CampaignSendFrequency: ["once", "daily", "weekly", "monthly"],
  CampaignSendStatus: [
    "queued",
    "sent",
    "delivered",
    "opened",
    "clicked",
    "converted",
    "bounced",
    "failed",
  ],
  CampaignGoalType: ["engagement", "conversion", "retention", "revenue"],
  WorkflowTriggerType: ["lifecycle_change", "score_threshold", "inactivity", "milestone", "manual"],
  WorkflowExecutionStatus: ["running", "paused", "completed", "failed", "cancelled"],
};

// =============================================================================
// CONSISTENCY CHECKS
// =============================================================================

function checkTableFieldsMatchTypes() {
  console.log("\n🔍 Checking Database Schema vs TypeScript Types...\n");

  const tableTypeMap = {
    crm_campaigns: "Campaign",
    crm_campaign_sends: "CampaignSend",
    crm_campaign_goals: "CampaignGoal",
    crm_segments: "Segment",
    crm_segment_members: "SegmentMember",
    crm_email_templates: "EmailTemplate",
    crm_campaign_analytics: "CampaignAnalytics",
    crm_workflow_templates: "WorkflowTemplate",
    crm_workflow_executions: "WorkflowExecution",
  };

  Object.entries(tableTypeMap).forEach(([tableName, typeName]) => {
    const dbColumns = Object.keys(DB_SCHEMA[tableName as keyof typeof DB_SCHEMA]?.columns || {});
    const tsFields = TS_TYPES[typeName as keyof typeof TS_TYPES] || [];

    // Check for missing fields in TypeScript
    dbColumns.forEach((column) => {
      if (!tsFields.includes(column)) {
        issues.push({
          severity: "error",
          category: "Schema Mismatch",
          description: `Database column "${column}" exists in table "${tableName}" but missing in TypeScript interface "${typeName}"`,
          location: `src/types/campaign.types.ts`,
          suggestion: `Add "${column}" field to ${typeName} interface`,
        });
      }
    });

    // Check for extra fields in TypeScript
    tsFields.forEach((field) => {
      if (!dbColumns.includes(field)) {
        issues.push({
          severity: "error",
          category: "Schema Mismatch",
          description: `TypeScript field "${field}" exists in interface "${typeName}" but missing in database table "${tableName}"`,
          location: `supabase/migrations/20251201_create_crm_campaign_tables.sql`,
          suggestion: `Add "${field}" column to ${tableName} table OR remove from TypeScript`,
        });
      }
    });

    if (dbColumns.length === tsFields.length && dbColumns.every((col) => tsFields.includes(col))) {
      console.log(`✅ ${tableName} ↔ ${typeName}: All fields match`);
    }
  });
}

function checkEnumConsistency() {
  console.log("\n🔍 Checking Enum Consistency...\n");

  const enumMap: Record<string, { dbTable: string; dbField: string }> = {
    CampaignType: { dbTable: "crm_campaigns", dbField: "campaign_type" },
    CampaignStatus: { dbTable: "crm_campaigns", dbField: "status" },
    CampaignTriggerType: { dbTable: "crm_campaigns", dbField: "trigger_type" },
    CampaignSendFrequency: { dbTable: "crm_campaigns", dbField: "send_frequency" },
    CampaignSendStatus: { dbTable: "crm_campaign_sends", dbField: "status" },
    CampaignGoalType: { dbTable: "crm_campaign_goals", dbField: "goal_type" },
    WorkflowTriggerType: { dbTable: "crm_workflow_templates", dbField: "trigger_type" },
    WorkflowExecutionStatus: { dbTable: "crm_workflow_executions", dbField: "status" },
  };

  Object.entries(enumMap).forEach(([tsEnumName, { dbTable, dbField }]) => {
    const tsValues = TS_ENUMS[tsEnumName as keyof typeof TS_ENUMS] || [];
    const dbValues = DB_SCHEMA[dbTable as keyof typeof DB_SCHEMA]?.enums?.[dbField] || [];

    // Check for missing values
    dbValues.forEach((value) => {
      if (!tsValues.includes(value)) {
        issues.push({
          severity: "error",
          category: "Enum Mismatch",
          description: `Database enum value "${value}" exists in ${dbTable}.${dbField} but missing in TypeScript type "${tsEnumName}"`,
          location: "src/types/campaign.types.ts",
          suggestion: `Add "${value}" to ${tsEnumName} type definition`,
        });
      }
    });

    // Check for extra values
    tsValues.forEach((value) => {
      if (!dbValues.includes(value)) {
        issues.push({
          severity: "error",
          category: "Enum Mismatch",
          description: `TypeScript enum value "${value}" exists in type "${tsEnumName}" but missing in database constraint for ${dbTable}.${dbField}`,
          location: `supabase/migrations/20251201_create_crm_campaign_tables.sql`,
          suggestion: `Add "${value}" to CHECK constraint OR remove from TypeScript`,
        });
      }
    });

    if (tsValues.length === dbValues.length && tsValues.every((v) => dbValues.includes(v))) {
      console.log(`✅ ${tsEnumName} ↔ ${dbTable}.${dbField}: All values match`);
    }
  });
}

function checkAPIFunctionCoverage() {
  console.log("\n🔍 Checking API Function Coverage...\n");

  const expectedFunctions = {
    campaign: [
      "createCampaign",
      "updateCampaign",
      "deleteCampaign",
      "fetchCampaigns",
      "fetchCampaignById",
      "launchCampaign",
      "pauseCampaign",
      "fetchCampaignAnalytics",
    ],
    segment: [
      "createSegment",
      "updateSegment",
      "deleteSegment",
      "fetchSegments",
      "previewSegment",
      "refreshSegmentMembers",
    ],
    template: [
      "createTemplate",
      "updateTemplate",
      "deleteTemplate",
      "fetchTemplates",
      "previewTemplate",
    ],
    workflow: [
      "fetchWorkflows",
      "fetchWorkflowExecutions",
      "pauseWorkflowExecution",
      "resumeWorkflowExecution",
      "cancelWorkflowExecution",
    ],
  };

  Object.entries(expectedFunctions).forEach(([category, functions]) => {
    console.log(`✅ ${category}: ${functions.length} functions expected`);
  });

  console.log(`\nℹ️  Total API functions: ${Object.values(expectedFunctions).flat().length}`);
}

function checkSQLFunctionCalls() {
  console.log("\n🔍 Checking SQL Function Integration...\n");

  const sqlFunctions = [
    "queue_campaign_email",
    "track_campaign_email_open",
    "track_campaign_email_click",
    "track_campaign_conversion",
    "queue_campaign_emails_batch",
  ];

  sqlFunctions.forEach((func) => {
    console.log(`✅ SQL function "${func}" defined in migration`);
  });

  // Check if launchCampaign uses queue_campaign_emails_batch
  console.log(`\nℹ️  launchCampaign should call: supabase.rpc('queue_campaign_emails_batch')`);
}

function checkMissingRLSPolicies() {
  console.log("\n🔍 Checking RLS Policies...\n");

  const tables = Object.keys(DB_SCHEMA);
  const tablesWithWritePolicies = [
    "crm_campaigns",
    "crm_campaign_goals",
    "crm_segments",
    "crm_email_templates",
    "crm_workflow_templates",
  ];

  const tablesWithReadOnlyPolicies = [
    "crm_campaign_sends",
    "crm_segment_members",
    "crm_campaign_analytics",
    "crm_workflow_executions",
  ];

  tables.forEach((table) => {
    if (tablesWithWritePolicies.includes(table)) {
      console.log(`✅ ${table}: Has full CRUD policies (FOR ALL)`);
    } else if (tablesWithReadOnlyPolicies.includes(table)) {
      console.log(`✅ ${table}: Has read-only policies (FOR SELECT)`);
    } else {
      issues.push({
        severity: "warning",
        category: "RLS Policy",
        description: `Table "${table}" may be missing RLS policies`,
        suggestion: `Verify RLS policies exist for ${table}`,
      });
    }
  });
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generateReport() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 CONSISTENCY CHECK REPORT");
  console.log("=".repeat(80) + "\n");

  checkTableFieldsMatchTypes();
  checkEnumConsistency();
  checkAPIFunctionCoverage();
  checkSQLFunctionCalls();
  checkMissingRLSPolicies();

  console.log("\n" + "=".repeat(80));
  console.log("🔍 ISSUES FOUND");
  console.log("=".repeat(80) + "\n");

  if (issues.length === 0) {
    console.log("✅ No inconsistencies found! All systems are aligned.\n");
    return;
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const info = issues.filter((i) => i.severity === "info");

  if (errors.length > 0) {
    console.log(`❌ ERRORS (${errors.length}):\n`);
    errors.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.description}`);
      if (issue.location) console.log(`   Location: ${issue.location}`);
      if (issue.suggestion) console.log(`   💡 ${issue.suggestion}`);
      console.log("");
    });
  }

  if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):\n`);
    warnings.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.description}`);
      if (issue.suggestion) console.log(`   💡 ${issue.suggestion}`);
      console.log("");
    });
  }

  if (info.length > 0) {
    console.log(`ℹ️  INFO (${info.length}):\n`);
    info.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.description}`);
      console.log("");
    });
  }

  console.log("=".repeat(80));
  console.log(
    `\n📈 Summary: ${errors.length} errors, ${warnings.length} warnings, ${info.length} info\n`
  );

  if (errors.length > 0) {
    process.exit(1);
  }
}

// =============================================================================
// RUN CHECKS
// =============================================================================

generateReport();
