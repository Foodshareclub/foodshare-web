/**
 * Campaign API Tests
 * Basic tests to verify API function structure and exports
 */
import { campaignAPI } from "../campaignAPI";
import { segmentBuilderAPI } from "../segmentBuilderAPI";

describe("Campaign API", () => {
  describe("Exports", () => {
    it("should export all campaign management functions", () => {
      expect(campaignAPI.createCampaign).toBeDefined();
      expect(campaignAPI.updateCampaign).toBeDefined();
      expect(campaignAPI.deleteCampaign).toBeDefined();
      expect(campaignAPI.fetchCampaigns).toBeDefined();
      expect(campaignAPI.fetchCampaignById).toBeDefined();
      expect(campaignAPI.launchCampaign).toBeDefined();
      expect(campaignAPI.pauseCampaign).toBeDefined();
      expect(campaignAPI.fetchCampaignAnalytics).toBeDefined();
    });

    it("should export all segment management functions", () => {
      expect(campaignAPI.createSegment).toBeDefined();
      expect(campaignAPI.updateSegment).toBeDefined();
      expect(campaignAPI.deleteSegment).toBeDefined();
      expect(campaignAPI.fetchSegments).toBeDefined();
      expect(campaignAPI.previewSegment).toBeDefined();
      expect(campaignAPI.refreshSegmentMembers).toBeDefined();
    });

    it("should export all template management functions", () => {
      expect(campaignAPI.createTemplate).toBeDefined();
      expect(campaignAPI.updateTemplate).toBeDefined();
      expect(campaignAPI.deleteTemplate).toBeDefined();
      expect(campaignAPI.fetchTemplates).toBeDefined();
      expect(campaignAPI.previewTemplate).toBeDefined();
    });

    it("should export all workflow management functions", () => {
      expect(campaignAPI.fetchWorkflows).toBeDefined();
      expect(campaignAPI.fetchWorkflowExecutions).toBeDefined();
      expect(campaignAPI.pauseWorkflowExecution).toBeDefined();
      expect(campaignAPI.resumeWorkflowExecution).toBeDefined();
      expect(campaignAPI.cancelWorkflowExecution).toBeDefined();
    });
  });

  describe("Function signatures", () => {
    it("campaign functions should be callable", () => {
      expect(typeof campaignAPI.createCampaign).toBe("function");
      expect(typeof campaignAPI.updateCampaign).toBe("function");
      expect(typeof campaignAPI.deleteCampaign).toBe("function");
      expect(typeof campaignAPI.fetchCampaigns).toBe("function");
      expect(typeof campaignAPI.fetchCampaignById).toBe("function");
      expect(typeof campaignAPI.launchCampaign).toBe("function");
      expect(typeof campaignAPI.pauseCampaign).toBe("function");
      expect(typeof campaignAPI.fetchCampaignAnalytics).toBe("function");
    });

    it("segment functions should be callable", () => {
      expect(typeof campaignAPI.createSegment).toBe("function");
      expect(typeof campaignAPI.updateSegment).toBe("function");
      expect(typeof campaignAPI.deleteSegment).toBe("function");
      expect(typeof campaignAPI.fetchSegments).toBe("function");
      expect(typeof campaignAPI.previewSegment).toBe("function");
      expect(typeof campaignAPI.refreshSegmentMembers).toBe("function");
    });

    it("template functions should be callable", () => {
      expect(typeof campaignAPI.createTemplate).toBe("function");
      expect(typeof campaignAPI.updateTemplate).toBe("function");
      expect(typeof campaignAPI.deleteTemplate).toBe("function");
      expect(typeof campaignAPI.fetchTemplates).toBe("function");
      expect(typeof campaignAPI.previewTemplate).toBe("function");
    });

    it("workflow functions should be callable", () => {
      expect(typeof campaignAPI.fetchWorkflows).toBe("function");
      expect(typeof campaignAPI.fetchWorkflowExecutions).toBe("function");
      expect(typeof campaignAPI.pauseWorkflowExecution).toBe("function");
      expect(typeof campaignAPI.resumeWorkflowExecution).toBe("function");
      expect(typeof campaignAPI.cancelWorkflowExecution).toBe("function");
    });
  });
});

describe("Segment Builder API", () => {
  describe("Exports", () => {
    it("should export all segment builder functions", () => {
      expect(segmentBuilderAPI.calculateSegmentSize).toBeDefined();
      expect(segmentBuilderAPI.getSampleMembers).toBeDefined();
      expect(segmentBuilderAPI.buildSegmentQuery).toBeDefined();
      expect(segmentBuilderAPI.validateSegmentFilters).toBeDefined();
    });
  });

  describe("Function signatures", () => {
    it("segment builder functions should be callable", () => {
      expect(typeof segmentBuilderAPI.calculateSegmentSize).toBe("function");
      expect(typeof segmentBuilderAPI.getSampleMembers).toBe("function");
      expect(typeof segmentBuilderAPI.buildSegmentQuery).toBe("function");
      expect(typeof segmentBuilderAPI.validateSegmentFilters).toBe("function");
    });
  });

  describe("buildSegmentQuery", () => {
    it("should generate SQL for basic filters", () => {
      const query = segmentBuilderAPI.buildSegmentQuery({
        customer_type: "donor",
        lifecycle_stage: "active",
      });

      expect(query).toContain("is_archived = false");
      expect(query).toContain("customer_type = 'donor'");
      expect(query).toContain("lifecycle_stage = 'active'");
    });

    it("should generate SQL for score ranges", () => {
      const query = segmentBuilderAPI.buildSegmentQuery({
        engagement_score: { min: 50, max: 100 },
        churn_risk_score: { min: 0, max: 30 },
      });

      expect(query).toContain("engagement_score >= 50");
      expect(query).toContain("engagement_score <= 100");
      expect(query).toContain("churn_risk_score >= 0");
      expect(query).toContain("churn_risk_score <= 30");
    });

    it("should handle empty filters", () => {
      const query = segmentBuilderAPI.buildSegmentQuery({});

      expect(query).toContain("is_archived = false");
      expect(query).toContain("SELECT * FROM crm_customers WHERE");
    });
  });

  describe("validateSegmentFilters", () => {
    it("should validate correct filters", () => {
      const result = segmentBuilderAPI.validateSegmentFilters({
        customer_type: "donor",
        lifecycle_stage: "active",
        engagement_score: { min: 50, max: 100 },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid customer type", () => {
      const result = segmentBuilderAPI.validateSegmentFilters({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customer_type: "invalid" as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Invalid customer_type");
    });

    it("should detect invalid score ranges", () => {
      const result = segmentBuilderAPI.validateSegmentFilters({
        engagement_score: { min: 150 },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("engagement_score.min must be between 0 and 100");
    });

    it("should detect min > max errors", () => {
      const result = segmentBuilderAPI.validateSegmentFilters({
        engagement_score: { min: 80, max: 20 },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("cannot be greater than"))).toBe(true);
    });

    it("should detect invalid date ranges", () => {
      const result = segmentBuilderAPI.validateSegmentFilters({
        created_after: "2024-12-31",
        created_before: "2024-01-01",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("cannot be later than"))).toBe(true);
    });
  });
});
