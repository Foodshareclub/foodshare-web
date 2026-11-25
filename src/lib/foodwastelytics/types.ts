import type React from "react";

export type EconomicScope = "all" | "high-income" | "developing";
export type LayoutVariant = "landing" | "dashboard" | "storyboard";
export type FoodwastelyticsSectionId =
  "overview" | "supply-chain" | "regional" | "commodities" | "sdg123" | "interventions" | "advisor";

export interface MacroIndicator {
  id: string;
  label: string;
  value: string;
  unit: string;
  badge: string;
  bullets: string[];
  icon: React.ElementType;
  accent: "amber" | "rose" | "emerald" | "sky";
  gradient: string;
}

export interface SupplyChainStage {
  id: string;
  name: string;
  lossTonnes: string;
  percentageOfLoss: number;
  ghgSharePct: number;
  economicLoss: string;
  primaryDrivers: string[];
  mitigationTech: string[];
  highIncomeRole: string;
  developingRole: string;
}

export interface RegionalMetric {
  id: string;
  region: string;
  perCapitaKg: number;
  totalLossMt: number;
  householdSharePct: number;
  primaryStage: string;
  statusColor: string;
  economicTier: "High-Income" | "Developing & Emerging" | "Mixed";
  keyTakeaway: string;
}

export interface CommodityVulnerability {
  id: string;
  name: string;
  category: string;
  lossRatePct: number;
  annualLossMt: number;
  carbonIntensity: number;
  waterFootprintLiters: number;
  icon: React.ElementType;
  primaryLossPoint: string;
  bullets: string[];
  color: string;
}

export interface PolicyIntervention {
  id: string;
  title: string;
  category: "Policy" | "Supply Chain" | "Consumer" | "Technology";
  potentialLossReductionPct: number;
  globalSavingsUsd: string;
  roiRatio: string;
  pioneerNations: string[];
  description: string;
  bullets: string[];
}

export interface SdgSimulationMetrics {
  divertedTonnesMillions: number;
  capitalSavedBillions: number;
  co2AvoidedGigatonnes: number;
  waterSavedKm3: number;
  peopleFedMillions: number;
}
