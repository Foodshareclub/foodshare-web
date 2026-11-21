"use client";

import { AdvisorChat } from "@/components/foodlytics/advisor-chat";
import { FloatingOrbs } from "@/components/gpu/FloatingOrbs";
import type { ChatMessage } from "@/lib/foodlytics/types";
import { supabase } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Apple,
  ArrowRight,
  BarChart3,
  Beef,
  Check,
  CheckCircle2,
  Compass,
  DollarSign,
  Download,
  Droplet,
  Fish,
  Flame,
  Globe,
  Info,
  Layers,
  Milk,
  Package,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Wheat,
  Zap,
} from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";

// ==========================================
// 1. DATA MODELS & INTERNATIONAL CONSTANTS
// Sourced from UNEP Food Waste Index 2024,
// UN FAO Food Loss Index, and Champions 12.3
// ==========================================

export type EconomicScope = "all" | "high-income" | "developing";

export interface MacroIndicator {
  id: string;
  label: string;
  value: string;
  unit: string;
  description: string;
  change: string;
  icon: React.ElementType;
  accent: "emerald" | "amber" | "rose" | "sky" | "violet";
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
}

export interface CommodityVulnerability {
  id: string;
  name: string;
  category: string;
  lossRatePct: number;
  annualLossMt: number;
  carbonIntensity: number; // kg CO2e per kg lost
  waterFootprintLiters: number; // liters per kg lost
  icon: React.ElementType;
  primaryLossPoint: string;
  color: string;
}

export interface PolicyIntervention {
  id: string;
  title: string;
  category: "Policy" | "Supply Chain" | "Consumer" | "Technology";
  potentialLossReductionPct: number;
  globalSavingsUsd: string;
  roiRatio: string; // e.g. "$14:1"
  pioneerNations: string[];
  description: string;
}

// Localized / Structured UI copy dictionary
const UI = {
  navHeading: "Navigation",
  heroBadge: "UNEP & FAO Aligned • Global Food Waste Intelligence",
  heroTitle: "Foodwastelytics",
  heroSubtitle:
    "Planetary food loss accounting, global agricultural supply chain benchmarks, and UN SDG 12.3 2030 halving models across world economies.",
  scopeAll: "All Global Economies",
  scopeHighIncome: "High-Income",
  scopeDeveloping: "Developing & Emerging",
  sdgBadge: "UN SDG 12.3 Target (2030)",
  exportDownloaded: "Brief Downloaded!",
  exportButton: "Export Intelligence Brief",
  overviewTitle: "Planetary Food Waste & Ecological Footprint",
  overviewSubtitle:
    "Authoritative global statistics synthesized from the UNEP Food Waste Index 2024 and UN FAO Food Loss Index.",
  scopeLabel: "Scope: ",
  allEconomiesScope: "195 Economies",
  boundariesTitle: "Planetary Boundaries & Human Nutrition Bridge",
  boundariesSubtitle: "Resource allocations lost to discarded crops versus global human deprivation.",
  championsLabel: "Champions 12.3 Synthesis",
  arableLandTitle: "Arable Land Area Wasted",
  arableLandValue: "1.40B ha",
  arableLandDesc: "28% of the world's total agricultural land is farmed for crops that are never consumed.",
  hungerCapacityTitle: "Hunger Elimination Capacity",
  hungerCapacityValue: "1.26B People",
  hungerCapacityDesc: "Nutritional calories wasted could feed almost double the 735 million undernourished people.",
  methaneTitle: "Municipal Methane Source",
  methaneValue: "20% Methane",
  methaneDesc: "One-fifth of all global municipal solid waste methane emanates from decomposing organic food.",
  fertilizerTitle: "Synthetic Fertilizer Lost",
  fertilizerValue: "23.4M Tonnes",
  fertilizerDesc: "Nitrogen, phosphorus, and potassium inputs wasted annually, driving aquatic eutrophication.",
  asymmetryTitle: "International Loss Asymmetry",
  asymmetryHighIncome:
    "High-Income Economies: Over 60% of food waste occurs at the consumer and retail levels due to cosmetic culling, portion sizes, and date labels.",
  asymmetryDeveloping:
    "Developing & Emerging Economies: Over 70% of food loss occurs during harvest and storage due to absence of cold storage and road infrastructure.",
  inspectFlowCTA: "Inspect Farm-to-Fork Flow",
  flowTitle: "Global Farm-to-Fork Loss Architecture",
  flowSubtitle:
    "Trace where the 1.32 Billion Tonnes are lost along the agricultural supply chain from initial harvest to consumer consumption.",
  streamOutput: "Agricultural Supply Chain Stream (100% Edible Output)",
  streamDiverted: "1.32B Tonnes Diverted",
  ribbonField: "Farm & Field (39%)",
  ribbonColdChain: "Cold Chain & Silo (26%)",
  ribbonProcessing: "Processing (12%)",
  ribbonRetail: "Retail (16%)",
  ribbonConsumer: "Plate & Kitchen (46% downstream)",
  lossSuffix: "% Loss",
  volumeLabel: "Volume: ",
  tonnesUnit: "t",
  stageDeepDiveTelemetry: "Stage Deep-Dive Telemetry",
  annualLossLabel: "Annual Economic Penalty: ",
  ghgShareLabel: "GHG Share: ",
  footprintSuffix: "% of Footprint",
  systemicDriversTitle: "Systemic Loss Drivers",
  mitigationSolutionsTitle: "UN FAO Proven Mitigation Solutions",
  highIncomeProfileTitle: "High-Income Economies Profile",
  developingProfileTitle: "Developing Economies Profile",
  regionalTitle: "UNEP Food Waste Index Regional Benchmarks",
  regionalSubtitle:
    "Empirical household and retail generation data comparing global continents and economic classifications.",
  perCapitaToggle: "Per Capita (kg / yr)",
  totalMassToggle: "Total Annual Mass (Mt)",
  tableCaption: "UNEP Food Waste Index Regional Comparison Data Table",
  colRegion: "Global Region",
  colEconomicTier: "Economic Tier",
  colPerCapita: "Per Capita Discard",
  colTotalLoss: "Total Annual Loss",
  colPrimaryVulnerability: "Primary Vulnerability",
  colHouseholdShare: "Household Share",
  kgUnit: "kg",
  mtUnit: "Mt",
  kgPerPersonUnit: "kg/person",
  generatesPrefix: "Generates ",
  generatesSuffix: " Megatonnes annually. Primary intervention focus is ",
  commoditiesTitle: "Commodity Vulnerability & Environmental Penalty Matrix",
  commoditiesSubtitle:
    "Analyzing discard percentages alongside greenhouse gas and freshwater footprints across 6 key food classes.",
  paradoxTitle: "The Weight vs Emissions Paradox",
  paradoxBody:
    "While Fruits, Vegetables, and Roots make up the largest physical volume of food discarded (~730M tonnes), Meat and Dairy drive more than 50% of the greenhouse gas emissions and freshwater waste despite accounting for only 14% of physical volume.",
  beefStatBadge: "1 kg Beef = 18.5 kg CO₂e Lost",
  wastedSuffix: "% Wasted",
  volumeLostLabel: "Global Volume Lost: ",
  millionTonnesUnit: "Million Tonnes",
  carbonPenaltyLabel: "Carbon Penalty: ",
  co2PerKgUnit: "kg CO₂e / kg",
  waterFootprintLabel: "Water Footprint: ",
  litersPerKgUnit: "L / kg",
  primaryLossNodeLabel: "Primary Loss Node: ",
  sdgModelerTitle: "UN SDG 12.3 2030 Halving Scenario Modeler",
  sdgModelerSubtitle:
    "Interactive global trajectory simulator projecting the ecological and humanitarian dividends of achieving the UN 50% food waste reduction goal.",
  scenarioSimulationTitle: "Interactive Global Target Simulation",
  scenarioMilestonePrompt: "Select Global Reduction Milestone",
  scenarioDescription:
    "Simulate the planetary reallocation of calories, avoided emissions, and recovered capital across international food systems.",
  unSdgGoalTag: "(UN SDG Target)",
  statFoodRescued: "Food Rescued",
  statFoodRescuedUnit: "M t",
  statFoodRescuedSub: "edible mass saved / yr",
  statCapitalRetained: "Capital Retained",
  statCapitalRetainedSub: "USD economic dividend",
  statEmissionsAvoided: "Emissions Avoided",
  statEmissionsAvoidedUnit: "Gt",
  statEmissionsAvoidedSub: "CO₂e greenhouse gas",
  statWaterSaved: "Water Saved",
  statWaterSavedUnit: "km³",
  statWaterSavedSub: "freshwater irrigation",
  statPeopleNourished: "People Nourished",
  statPeopleNourishedSub: "caloric human bridge",
  milestonesTitle: "Global 2030 Halving Milestones",
  m1Tag: "2024 Baseline",
  m1Title: "UNEP Benchmark Publication",
  m1Desc: "Global baseline established at 1.05 Billion tonnes across consumer, retail, and food service.",
  m2Tag: "2026 Measurement Gate",
  m2Title: "Harmonized Mandatory Reporting",
  m2Desc: "Supermarkets and food enterprises over $50M adopt universal waste audit protocols.",
  m3Tag: "2028 Acceleration",
  m3Title: "Cold Chain & Dynamic Pricing",
  m3Desc: "Decentralized solar cold rooms scale to 40% of developing smallholders; automated markdowns.",
  m4Tag: "2030 UN Goal",
  m4Title: "50% Halving Realized",
  m4Desc: "Per capita waste reduced by half; 660 Million tonnes saved annually worldwide.",
  interventionsTitle: "High-Impact Global Policy & Technological Interventions",
  interventionsSubtitle:
    "Highest return-on-investment interventions identified by Champions 12.3 and international food waste coalitions.",
  roiPrefix: "ROI: ",
  lossPotentialLabel: "Loss Reduction Potential: ",
  upToPrefix: "Up to ",
  globalValueLabel: "Global Value Unlocked: ",
  perYearSuffix: " / yr",
  pioneersLabel: "Pioneer Jurisdictions: ",
  advisorTitle: "Global Food Waste Policy & Intelligence Advisor",
  advisorSubtitle:
    "Query international research databases on UNEP methodologies, Champions 12.3 economic models, smallholder cold storage, and date labeling frameworks.",
  footerTitle: "Foodwastelytics — Global Food Waste Intelligence & Planetary Impact Suite",
  footerSubtitle:
    "Calculations based on standard UN FAO Food Loss Index, UNEP Food Waste Index Report 2024, Champions 12.3 ROI synthesis, and World Bank agricultural supply chain models.",
};

const GLOBAL_MACRO_INDICATORS: MacroIndicator[] = [
  {
    id: "edible-mass",
    label: "Global Edible Food Discarded",
    value: "1.32",
    unit: "Billion Tonnes / yr",
    description: "Approximately 33.3% (one-third) of all food produced across the planet is never consumed.",
    change: "3× human biomass",
    icon: Scale,
    accent: "amber",
  },
  {
    id: "economic-loss",
    label: "Direct Economic Loss",
    value: "$1.05",
    unit: "Trillion USD / yr",
    description:
      "Full societal and environmental cost reaches $2.6 Trillion USD annually when externalities are priced.",
    change: "1.2% Global GDP",
    icon: DollarSign,
    accent: "rose",
  },
  {
    id: "ghg-emissions",
    label: "Greenhouse Gas Penalty",
    value: "3.80",
    unit: "GigaTonnes CO₂e / yr",
    description:
      "Accounts for 8% to 10% of total anthropogenic emissions. If food waste were a country, it would be #3.",
    change: "#3 Emitter Globally",
    icon: Flame,
    accent: "emerald",
  },
  {
    id: "freshwater",
    label: "Irrigation Freshwater Lost",
    value: "252",
    unit: "km³ Water / yr",
    description: "Equivalent to 3 times the volume of Lake Geneva or 24% of all agricultural freshwater consumed.",
    change: "24% Agri Water",
    icon: Droplet,
    accent: "sky",
  },
];

const SUPPLY_CHAIN_STAGES: SupplyChainStage[] = [
  {
    id: "production",
    name: "1. Agricultural Production & Harvest",
    lossTonnes: "520 Million",
    percentageOfLoss: 39,
    ghgSharePct: 22,
    economicLoss: "$310 Billion",
    primaryDrivers: [
      "Strict aesthetic cosmetic grading requirements",
      "Pest and pathogen infestation during harvest window",
      "Market price dips causing unharvested acreage",
      "Labor shortages and mechanical harvesting damage",
    ],
    mitigationTech: [
      "AI drone spectral imaging for optimal harvest timing",
      "Secondary processing streams for cosmetic 'imperfect' crops",
      "Post-harvest gleaning cooperatives and tax credits",
    ],
    highIncomeRole: "High cosmetic culling to satisfy retail supermarket grade standards.",
    developingRole: "Significant field losses due to extreme weather, pest susceptibility, and lack of farm machinery.",
  },
  {
    id: "post-harvest",
    name: "2. Post-Harvest Handling & Storage",
    lossTonnes: "350 Million",
    percentageOfLoss: 26,
    ghgSharePct: 18,
    economicLoss: "$240 Billion",
    primaryDrivers: [
      "Inadequate rural cold-chain infrastructure",
      "Unsealed grain silos exposed to mold and rodents",
      "Severe ambient heat and humidity during transit",
      "Unpaved rural roads prolonging transport duration",
    ],
    mitigationTech: [
      "Decentralized off-grid solar refrigerated cold rooms",
      "Hermetic triple-layer grain storage bags (PICS bags)",
      "Phase-change thermal transport containers",
    ],
    highIncomeRole: "Minor loss (<3%) thanks to sophisticated refrigerated telematics fleets.",
    developingRole:
      "Primary vulnerability (>65% of loss) in Sub-Saharan Africa and South Asia due to cold chain deficits.",
  },
  {
    id: "processing",
    name: "3. Industrial Processing & Packaging",
    lossTonnes: "160 Million",
    percentageOfLoss: 12,
    ghgSharePct: 14,
    economicLoss: "$130 Billion",
    primaryDrivers: [
      "Excessive industrial peeling, trimming, and skinning",
      "Contamination events and line switchover washouts",
      "Packaging machine calibration errors and sealing failures",
      "Overproduction of customized private-label SKUs",
    ],
    mitigationTech: [
      "Upcycled side-stream byproduct valorization (e.g., spent grains)",
      "High-pressure processing (HPP) non-thermal preservation",
      "Optical and hyperspectral automated sorters",
    ],
    highIncomeRole: "High standards for packaging appearance lead to bulk reject runs.",
    developingRole: "Limited industrial agro-processing capacity leads to raw perishable exports.",
  },
  {
    id: "retail",
    name: "4. Wholesale, Distribution & Retail",
    lossTonnes: "210 Million",
    percentageOfLoss: 16,
    ghgSharePct: 17,
    economicLoss: "$190 Billion",
    primaryDrivers: [
      "Cosmetic rejection of slightly bruised produce",
      "Supermarket display overstocking ('visual abundance' psychology)",
      "Overly conservative commercial shelf-life expiration dates",
      "Refrigeration display case temperature fluctuations",
    ],
    mitigationTech: [
      "AI dynamic discount pricing algorithms as expiry approaches",
      "Direct integration with surplus food rescue APIs (FoodShare)",
      "Plant-based edible shelf-life extension coatings",
    ],
    highIncomeRole: "Extensive store-level discards due to mandatory sell-by shelf clearance.",
    developingRole: "Informal open-air markets experience rapid heat-induced wilting.",
  },
  {
    id: "consumer",
    name: "5. Consumer & Foodservice",
    lossTonnes: "610 Million",
    percentageOfLoss: 46,
    ghgSharePct: 29,
    economicLoss: "$380 Billion",
    primaryDrivers: [
      "Confusion between 'Best Before' (quality) and 'Use By' (safety)",
      "Excessive portion sizing in restaurants and hospitality",
      "Lack of kitchen inventory visibility and impulsive over-buying",
      "Improper residential refrigerator temperature management",
    ],
    mitigationTech: [
      "Legislative harmonization of standardized date labels",
      "Consumer zero-waste kitchen intelligence platforms",
      "Mandatory municipal organic waste curbside collection",
    ],
    highIncomeRole: "Accounts for over 60% of total national waste stream (60-120 kg/capita/year).",
    developingRole: "Minimal residential discards (<10 kg/capita) due to household resource frugality.",
  },
];

const REGIONAL_BENCHMARKS: RegionalMetric[] = [
  {
    id: "north-america",
    region: "North America",
    perCapitaKg: 115,
    totalLossMt: 43.5,
    householdSharePct: 62,
    primaryStage: "Consumer & Retail",
    statusColor: "rose",
    economicTier: "High-Income",
  },
  {
    id: "europe",
    region: "Europe & Central Asia",
    perCapitaKg: 92,
    totalLossMt: 58.2,
    householdSharePct: 54,
    primaryStage: "Consumer & Processing",
    statusColor: "amber",
    economicTier: "High-Income",
  },
  {
    id: "middle-east",
    region: "Middle East & North Africa",
    perCapitaKg: 102,
    totalLossMt: 48.0,
    householdSharePct: 58,
    primaryStage: "Hospitality & Consumer",
    statusColor: "amber",
    economicTier: "Mixed",
  },
  {
    id: "latin-america",
    region: "Latin America & Caribbean",
    perCapitaKg: 84,
    totalLossMt: 55.4,
    householdSharePct: 42,
    primaryStage: "Harvest & Logistics",
    statusColor: "emerald",
    economicTier: "Developing & Emerging",
  },
  {
    id: "east-asia",
    region: "East Asia & Pacific",
    perCapitaKg: 78,
    totalLossMt: 185.0,
    householdSharePct: 48,
    primaryStage: "Retail & Storage",
    statusColor: "emerald",
    economicTier: "Mixed",
  },
  {
    id: "sub-saharan-africa",
    region: "Sub-Saharan Africa",
    perCapitaKg: 68,
    totalLossMt: 82.1,
    householdSharePct: 18,
    primaryStage: "Post-Harvest Storage",
    statusColor: "sky",
    economicTier: "Developing & Emerging",
  },
  {
    id: "south-asia",
    region: "South Asia",
    perCapitaKg: 66,
    totalLossMt: 132.8,
    householdSharePct: 24,
    primaryStage: "Post-Harvest Handling",
    statusColor: "sky",
    economicTier: "Developing & Emerging",
  },
];

const COMMODITY_MATRIX: CommodityVulnerability[] = [
  {
    id: "fruits-vegetables",
    name: "Fruits & Vegetables",
    category: "Produce",
    lossRatePct: 45,
    annualLossMt: 490,
    carbonIntensity: 1.1,
    waterFootprintLiters: 960,
    icon: Apple,
    primaryLossPoint: "Post-harvest handling & retail aesthetic culling",
    color: "emerald",
  },
  {
    id: "roots-tubers",
    name: "Roots & Tubers",
    category: "Roots",
    lossRatePct: 45,
    annualLossMt: 240,
    carbonIntensity: 0.8,
    waterFootprintLiters: 420,
    icon: Wheat,
    primaryLossPoint: "Harvest mechanical cuts, storage rot & transport",
    color: "amber",
  },
  {
    id: "fish-seafood",
    name: "Fish & Seafood",
    category: "Seafood",
    lossRatePct: 35,
    annualLossMt: 55,
    carbonIntensity: 5.4,
    waterFootprintLiters: 1950,
    icon: Fish,
    primaryLossPoint: "Bycatch discards at sea & cold chain failure",
    color: "sky",
  },
  {
    id: "cereals-grains",
    name: "Cereals & Grains",
    category: "Grains",
    lossRatePct: 30,
    annualLossMt: 290,
    carbonIntensity: 1.9,
    waterFootprintLiters: 1640,
    icon: Wheat,
    primaryLossPoint: "Silo storage pests, mycotoxins & consumer plate waste",
    color: "amber",
  },
  {
    id: "dairy-products",
    name: "Dairy & Milk Products",
    category: "Dairy",
    lossRatePct: 20,
    annualLossMt: 115,
    carbonIntensity: 3.2,
    waterFootprintLiters: 3100,
    icon: Milk,
    primaryLossPoint: "Cold chain transit and retail/consumer expiration",
    color: "violet",
  },
  {
    id: "meat-poultry",
    name: "Meat & Poultry",
    category: "Meat",
    lossRatePct: 20,
    annualLossMt: 70,
    carbonIntensity: 18.5,
    waterFootprintLiters: 15400,
    icon: Beef,
    primaryLossPoint: "Retail clearance expiration & oversized consumer portions",
    color: "rose",
  },
];

const POLICY_INTERVENTIONS: PolicyIntervention[] = [
  {
    id: "pol-1",
    title: "Standardized Date Labeling Frameworks",
    category: "Policy",
    potentialLossReductionPct: 15,
    globalSavingsUsd: "$78 Billion",
    roiRatio: "$14:1",
    pioneerNations: ["United States (FDA/USDA)", "European Union", "United Kingdom"],
    description:
      "Clarifying 'Best If Used By' (peak culinary quality) versus 'Use By' (safety threshold) eliminates consumer confusion that accounts for 20% of residential discards.",
  },
  {
    id: "pol-2",
    title: "Solar-Powered Cold-Room Microgrids",
    category: "Supply Chain",
    potentialLossReductionPct: 24,
    globalSavingsUsd: "$112 Billion",
    roiRatio: "$9:1",
    pioneerNations: ["Kenya", "India", "Nigeria", "Rwanda"],
    description:
      "Deploying 100% solar pay-as-you-store modular cold storage at farm gates triples shelf life for horticultural farmers and halts post-harvest rot.",
  },
  {
    id: "pol-3",
    title: "Food Donation Good Samaritan Acts & Tax Parity",
    category: "Policy",
    potentialLossReductionPct: 18,
    globalSavingsUsd: "$64 Billion",
    roiRatio: "$12:1",
    pioneerNations: ["France", "Italy", "United States"],
    description:
      "Granting legal liability protection to donors and providing enhanced tax deductions makes food surplus redistribution the default over commercial disposal.",
  },
  {
    id: "pol-4",
    title: "AI Dynamic Markdowns & Demand Sensing in Retail",
    category: "Technology",
    potentialLossReductionPct: 22,
    globalSavingsUsd: "$85 Billion",
    roiRatio: "$16:1",
    pioneerNations: ["Japan", "Germany", "South Korea"],
    description:
      "Automated electronic shelf labels dynamically discount inventory as expiry approaches, achieving up to 60% sell-through of expiring supermarket inventory.",
  },
  {
    id: "pol-5",
    title: "Mandatory Organic Waste Landfill Bans",
    category: "Policy",
    potentialLossReductionPct: 28,
    globalSavingsUsd: "$95 Billion",
    roiRatio: "$11:1",
    pioneerNations: ["South Korea (100% food waste ban)", "France", "California (SB 1383)"],
    description:
      "Prohibiting commercial and residential food waste from landfills eliminates fugitive methane emissions and finances anaerobic digestion and composting systems.",
  },
];

const SECTIONS = [
  { id: "overview", label: "Planetary Overview", icon: Globe },
  { id: "supply-chain", label: "Farm-to-Fork Flow", icon: Layers },
  { id: "regional", label: "Regional Benchmarks", icon: BarChart3 },
  { id: "commodities", label: "Commodity Matrix", icon: Package },
  { id: "sdg123", label: "UN SDG 12.3 Modeler", icon: Target },
  { id: "interventions", label: "Global Policy & Tech", icon: ShieldCheck },
  { id: "advisor", label: "Global AI Advisor", icon: Sparkles },
] as const;

export default function FoodwastelyticsPage() {
  useEffect(() => {
    document.title = "Foodwastelytics — Global Food Waste Intelligence | FoodShare";
  }, []);

  // Active top-level section
  const [activeTab, setActiveTab] = useState<(typeof SECTIONS)[number]["id"]>("overview");

  // Economic perspective: all, high-income, developing
  const [economicScope, setEconomicScope] = useState<EconomicScope>("all");

  // UN SDG 12.3 Target Reduction Simulator: 10%, 25%, 50% (UN Goal), 60%
  const [targetReductionPct, setTargetReductionPct] = useState<number>(50);

  // Selected supply chain stage for deep dive
  const [selectedStageId, setSelectedStageId] = useState<string>("production");

  // Regional view mode: per-capita vs total-mass
  const [regionalViewMode, setRegionalViewMode] = useState<"perCapita" | "totalMass">("perCapita");

  // Export state
  const [isExportCopied, setIsExportCopied] = useState(false);

  // Filtered Regional Data based on economic scope
  const filteredRegions = useMemo(() => {
    if (economicScope === "high-income") {
      return REGIONAL_BENCHMARKS.filter((r) => r.economicTier === "High-Income");
    }
    if (economicScope === "developing") {
      return REGIONAL_BENCHMARKS.filter((r) => r.economicTier === "Developing & Emerging");
    }
    return REGIONAL_BENCHMARKS;
  }, [economicScope]);

  // Selected stage details
  const activeStage = useMemo(() => {
    return SUPPLY_CHAIN_STAGES.find((s) => s.id === selectedStageId) || SUPPLY_CHAIN_STAGES[0];
  }, [selectedStageId]);

  // UN SDG 12.3 Halving Calculations (Baseline: 1.32B tonnes / $1.05T / 3.8 Gt CO2e / 252 km3 water)
  const simulatedReductionMetrics = useMemo(() => {
    const fraction = targetReductionPct / 100;
    const divertedTonnesMillions = Math.round(1320 * fraction);
    const capitalSavedBillions = Math.round(1050 * fraction);
    const co2AvoidedGigatonnes = Number((3.8 * fraction).toFixed(2));
    const waterSavedKm3 = Math.round(252 * fraction);
    const peopleFedMillions = Math.round(1260 * fraction);

    return {
      divertedTonnesMillions,
      capitalSavedBillions,
      co2AvoidedGigatonnes,
      waterSavedKm3,
      peopleFedMillions,
    };
  }, [targetReductionPct]);

  // Advisor Chat State for Global Policy and Food Loss
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-global",
      role: "model",
      text: "Welcome to Foodwastelytics Global Intelligence. I am your international advisor on UN SDG 12.3 targets, agricultural supply chain interventions, cold-chain deployment, and international food waste legislation. Ask me any question on planetary food loss accounting or policy strategies.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const getSmartGlobalAdvisoryResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes("unep") || q.includes("index") || q.includes("calculate") || q.includes("method")) {
      return `### UNEP Food Waste Index Methodology\n\n1. **Scope**: The UNEP Food Waste Index measures food and associated inedible parts removed from the human food supply chain across three distinct tiers:\n   - **Household**: Residential kitchens and plate waste (~60% of total retail/consumer waste).\n   - **Food Service**: Restaurants, institutional catering, and hospitality (~28%).\n   - **Retail**: Supermarkets, grocery stores, and corner markets (~12%).\n2. **Measurement Tiers**:\n   - **Tier 1 (Modeling)**: Uses international proxy estimates for nations lacking primary field audits.\n   - **Tier 2 (Direct Measurement)**: Uses localized compositional waste audits, volumetric kitchen diaries, and waste sorting.\n   - **Tier 3 (In-Depth Telemetry)**: Granular tracking separating edible discarded food from true inedible scraps (bones, pits).\n3. **Key Finding**: Household food waste is **not** exclusively a rich-country phenomenon. Middle-income nations exhibit per capita waste levels virtually identical to high-income economies (~70–90 kg/capita/year).`;
    }
    if (q.includes("sdg 12.3") || q.includes("target") || q.includes("2030") || q.includes("halv")) {
      return `### UN SDG Target 12.3 Blueprint\n\n**Official UN Mandate**:\n> *"By 2030, halve per capita global food waste at the retail and consumer levels and reduce food losses along production and supply chains, including post-harvest losses."*\n\n- **Target Baseline**: 1.32 Billion Metric Tonnes wasted per annum.\n- **Halving Dividend**:\n  - Diverting **660 Million Metric Tonnes** of edible sustenance.\n  - Mitigating **1.70 to 1.90 GigaTonnes of CO₂e** (equivalent to removing all passenger vehicles in the EU and US).\n  - Unlocking **+$525 Billion USD** in direct economic productivity.\n  - Saving **126 km³ of freshwater**.\n  - Reallocating calories to reliably feed **630+ Million individuals**, virtually eliminating world acute food insecurity.`;
    }
    if (q.includes("cold chain") || q.includes("africa") || q.includes("storage") || q.includes("post-harvest")) {
      return `### Decentralized Cold-Chain Microgrids\n\nIn Sub-Saharan Africa and South Asia, **up to 50% of fruits and vegetables rot** before ever reaching an urban consumer due to the complete lack of unbroken cold chains.\n\n1. **Off-Grid Solar Cold Rooms (e.g., ColdHubs)**:\n   - 100% solar-powered 10-foot walk-in cold rooms installed directly at farm gates and outdoor markets.\n   - Extend perishability from **2 days to 21 days** using thermal phase-change energy storage.\n2. **Pay-As-You-Store Model**:\n   - Smallholder farmers pay ~$0.50 per 20kg crate per day, avoiding debt and increasing farmer income by an average of 50%.\n3. **PICS Hermetic Bags**:\n   - Multi-layer chemical-free storage bags eliminate oxygen, suffocating weevils and grain beetles, preserving staple grains for over 12 months with 0% chemical residue.`;
    }
    if (q.includes("date label") || q.includes("best before") || q.includes("use by") || q.includes("law")) {
      return `### Global Date Labeling Policy Reforms\n\nConsumer date stamp confusion is directly responsible for **20% of edible food discarded** in Western households.\n\n- **"Best If Used By / Best Before" (Quality Indicator)**:\n  - Refers strictly to organoleptic attributes (crunch, aroma, color). Food is completely safe to eat weeks or months past this mark if packaging is intact.\n- **"Use By" (Safety Indicator)**:\n  - Reserved exclusively for microbiologically sensitive perishable foods (e.g. unpasteurized milk, fresh poultry, pre-cooked shellfish).\n- **Regulatory Actions**:\n  - The UK and European supermarkets (e.g., Tesco, Marks & Spencer) have successfully removed "Best Before" dates entirely from hundreds of produce lines, cutting in-store and household discard by up to 15%.`;
    }
    return `### Champions 12.3 Economic Case for Food Loss Reduction\n\n- **Return on Investment (ROI)**: A landmark study of 1,200 business sites across 17 countries found that for every **$1 invested** in reducing food loss and waste, companies saved **$14 in operating costs** (a 14:1 financial return).\n- **Top Interventions**: Measurement systems, employee zero-waste training, cold chain monitoring, and standardized date labeling deliver the fastest returns.\n- **Policy Priority**: Mandatory organic waste landfill diversion (as pioneered in South Korea with 100% diversion and France with supermarket donation mandates).\n\nWhat international jurisdiction or supply chain phase would you like to explore?`;
  };

  const handleSendChatMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const invokePromise = supabase.functions.invoke("api-v1-advisory", {
        body: { query: textToSend },
      });
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("Advisory timeout") }), 2500),
      );

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      if (error || !data) {
        const fallbackReply = getSmartGlobalAdvisoryResponse(textToSend);
        setChatMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            role: "model",
            text: fallbackReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        return;
      }

      const replyText = typeof data === "string" ? data : data?.reply || data || "No response received.";
      setChatMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "model",
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      const fallbackReply = getSmartGlobalAdvisoryResponse(textToSend);
      setChatMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "model",
          text: fallbackReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([
      {
        id: "welcome-global",
        role: "model",
        text: "Welcome to Foodwastelytics Global Intelligence. I am your international advisor on UN SDG 12.3 targets, agricultural supply chain interventions, cold-chain deployment, and international food waste legislation. Ask me any question on planetary food loss accounting or policy strategies.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleExportGlobalBrief = () => {
    const report = `# FoodShare Foodwastelytics — Global Food Waste Intelligence Brief
Generated: ${new Date().toLocaleDateString()}
Standards: UNEP Food Waste Index 2024 • UN FAO Food Loss Index • UN SDG 12.3

## 1. Executive Summary & Planetary Macro Indicators
- Global Edible Food Discarded: 1.32 Billion Metric Tonnes / year (33.3% of global harvest)
- Direct Economic Loss: $1.05 Trillion USD / year ($2.6T societal & environmental cost)
- Greenhouse Gas Impact: 3.80 GigaTonnes CO₂e / year (8% - 10% of total global emissions)
- Irrigation Freshwater Lost: 252 km³ / year (3× the volume of Lake Geneva)
- Arable Land Lost to Unconsumed Crops: 1.40 Billion Hectares (28% of Earth's agricultural area)
- Caloric Recovery Capacity: Sufficient to nourish 1.26 Billion individuals worldwide

## 2. Supply Chain Loss Distribution (Farm-to-Fork)
1. Agricultural Production: 520 Million Tonnes (39% of loss) — Aesthetic grading, unharvested acreage
2. Post-Harvest & Cold Chain: 350 Million Tonnes (26% of loss) — Broken cold chain, silo spoilage
3. Industrial Processing: 160 Million Tonnes (12% of loss) — Trimming, sorting calibration
4. Wholesale & Retail: 210 Million Tonnes (16% of loss) — Expiry clearance, overstocking
5. Consumer & Foodservice: 610 Million Tonnes (46% of downstream stream) — Date label confusion, plate waste

## 3. UN SDG 12.3 Halving Target Projections (${targetReductionPct}% Target Selected)
- Annual Food Saved: ${simulatedReductionMetrics.divertedTonnesMillions} Million Metric Tonnes
- Direct Capital Saved: +$${simulatedReductionMetrics.capitalSavedBillions} Billion USD
- Prevented Greenhouse Gas: ${simulatedReductionMetrics.co2AvoidedGigatonnes} Gt CO₂e
- Freshwater Conserved: ${simulatedReductionMetrics.waterSavedKm3} km³
- Undernourished Population Nourished: ${simulatedReductionMetrics.peopleFedMillions} Million People

## 4. UNEP Regional Benchmarks
${REGIONAL_BENCHMARKS.map(
  (r) =>
    `- ${r.region}: ${r.perCapitaKg} kg/capita/year | Total: ${r.totalLossMt} Mt/yr | Primary Loss Stage: ${r.primaryStage}`,
).join("\n")}

## 5. Commodity Vulnerability & Carbon Disparity
${COMMODITY_MATRIX.map(
  (c) =>
    `- ${c.name}: ${c.lossRatePct}% discarded | ${c.annualLossMt} Mt loss | ${c.carbonIntensity} kg CO₂e/kg footprint`,
).join("\n")}

Published by FoodShare Foodwastelytics (https://foodshare.club/foodwastelytics)
`;

    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foodwastelytics-global-brief-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExportCopied(true);
    setTimeout(() => setIsExportCopied(false), 2500);
  };

  return (
    <div className="min-h-screen text-foreground font-sans antialiased flex flex-col flex-1 pb-16">
      <FloatingOrbs opacity={0.12} />

      {/* Hero Header */}
      <section className="relative z-10 border-b border-border/40 bg-card/75 backdrop-blur-xl px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Globe className="size-3.5 animate-pulse" />
              <span>{UI.heroBadge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              <span>{UI.heroTitle}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">{UI.heroSubtitle}</p>
          </div>

          {/* Perspective Selector & Global Export */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto">
            {/* Global Perspective Pill */}
            <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEconomicScope("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  economicScope === "all"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {UI.scopeAll}
              </button>
              <button
                type="button"
                onClick={() => setEconomicScope("high-income")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  economicScope === "high-income"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {UI.scopeHighIncome}
              </button>
              <button
                type="button"
                onClick={() => setEconomicScope("developing")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  economicScope === "developing"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {UI.scopeDeveloping}
              </button>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <Target className="size-3.5" />
              <span>{UI.sdgBadge}</span>
            </div>

            <button
              type="button"
              onClick={handleExportGlobalBrief}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-card hover:bg-muted border border-border/60 text-foreground text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              {isExportCopied ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold">{UI.exportDownloaded}</span>
                </>
              ) : (
                <>
                  <Download className="size-3.5 text-muted-foreground" />
                  <span>{UI.exportButton}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 flex flex-col md:flex-row gap-8 justify-start">
        {/* Left Section Navigation */}
        <aside className="md:w-56 shrink-0">
          <nav
            style={{ scrollbarWidth: "none" }}
            aria-labelledby="foodwastelytics-nav-heading"
            className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible md:sticky md:top-28 bg-card/60 backdrop-blur-md p-1.5 rounded-2xl border border-border/40 font-semibold text-xs [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <h2 id="foodwastelytics-nav-heading" className="sr-only">
              {UI.navHeading}
            </h2>
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap text-start ${
                  activeTab === id
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                <Icon
                  className={`size-4 transition-colors ${
                    activeTab === id ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  }`}
                />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Tab Views */}
        <div className="flex-1 min-w-0 flex flex-col justify-start">
          <AnimatePresence mode="wait">
            {/* TAB 1: PLANETARY OVERVIEW */}
            {activeTab === "overview" && (
              <motion.div
                key="overview-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-10"
              >
                {/* Global Scale Header */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/40 pb-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                        <Globe className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{UI.overviewTitle}</span>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{UI.overviewSubtitle}</p>
                    </div>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full shrink-0 border border-emerald-500/20">
                      {UI.scopeLabel}
                      {economicScope === "all" ? UI.allEconomiesScope : economicScope.toUpperCase()}
                    </span>
                  </div>

                  {/* 4 Hero Bento Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {GLOBAL_MACRO_INDICATORS.map((metric) => {
                      const IconComponent = metric.icon;
                      return (
                        <div
                          key={metric.id}
                          className="rounded-2xl p-5 bg-card/75 border border-border/50 backdrop-blur-md shadow-xs hover:border-emerald-500/30 transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                              {metric.label}
                            </span>
                            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <IconComponent className="size-4" />
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                              {metric.value}
                            </div>
                            <span className="text-xs text-muted-foreground font-medium block mt-0.5">
                              {metric.unit}
                            </span>
                          </div>
                          <div className="mt-3 border-t border-border/40 pt-2 flex items-center justify-between">
                            <p className="text-[11px] text-muted-foreground/80 leading-relaxed max-w-[70%]">
                              {metric.description}
                            </p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground shrink-0">
                              {metric.change}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Planetary Boundaries & Humanitarian Impact */}
                <div className="rounded-2xl p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/40 border border-border/50 backdrop-blur-md space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Compass className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{UI.boundariesTitle}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">{UI.boundariesSubtitle}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {UI.championsLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        {UI.arableLandTitle}
                      </span>
                      <span className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
                        {UI.arableLandValue}
                      </span>
                      <span className="text-[10px] text-muted-foreground block leading-relaxed">
                        {UI.arableLandDesc}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        {UI.hungerCapacityTitle}
                      </span>
                      <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {UI.hungerCapacityValue}
                      </span>
                      <span className="text-[10px] text-muted-foreground block leading-relaxed">
                        {UI.hungerCapacityDesc}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">{UI.methaneTitle}</span>
                      <span className="text-xl sm:text-2xl font-extrabold text-amber-500 font-mono">
                        {UI.methaneValue}
                      </span>
                      <span className="text-[10px] text-muted-foreground block leading-relaxed">{UI.methaneDesc}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        {UI.fertilizerTitle}
                      </span>
                      <span className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
                        {UI.fertilizerValue}
                      </span>
                      <span className="text-[10px] text-muted-foreground block leading-relaxed">
                        {UI.fertilizerDesc}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Perspective Divergence Callout */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Info className="size-3.5" />
                      <span>{UI.asymmetryTitle}</span>
                    </span>
                    <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                      {UI.asymmetryHighIncome}
                      <br />
                      {UI.asymmetryDeveloping}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("supply-chain")}
                    className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <span>{UI.inspectFlowCTA}</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* TAB 2: FARM-TO-FORK SUPPLY CHAIN FLOW */}
            {activeTab === "supply-chain" && (
              <motion.div
                key="supply-chain-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    <Layers className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{UI.flowTitle}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{UI.flowSubtitle}</p>
                </div>

                {/* Supply Chain Interactive Pipeline Ribbon */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
                    <span>{UI.streamOutput}</span>
                    <span>{UI.streamDiverted}</span>
                  </div>
                  <div className="h-6 w-full rounded-xl bg-muted/60 overflow-hidden flex p-1 gap-1 border border-border/50">
                    {SUPPLY_CHAIN_STAGES.map((stg) => (
                      <button
                        type="button"
                        key={stg.id}
                        onClick={() => setSelectedStageId(stg.id)}
                        style={{ width: `${stg.percentageOfLoss}%` }}
                        className={`h-full rounded-lg transition-all cursor-pointer relative group ${
                          selectedStageId === stg.id
                            ? "bg-emerald-600 shadow-xs ring-2 ring-emerald-500/40"
                            : "bg-emerald-500/25 hover:bg-emerald-500/40"
                        }`}
                        title={`${stg.name}: ${stg.percentageOfLoss}%`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>{UI.ribbonField}</span>
                    <span>{UI.ribbonColdChain}</span>
                    <span>{UI.ribbonProcessing}</span>
                    <span>{UI.ribbonRetail}</span>
                    <span>{UI.ribbonConsumer}</span>
                  </div>
                </div>

                {/* Stage Cards Selector Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SUPPLY_CHAIN_STAGES.map((stage) => {
                    const isSelected = selectedStageId === stage.id;
                    return (
                      <button
                        type="button"
                        key={stage.id}
                        onClick={() => setSelectedStageId(stage.id)}
                        className={`p-4 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-card border-emerald-500 ring-1 ring-emerald-500/40 shadow-xs"
                            : "bg-card/60 hover:bg-card border-border/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-foreground">{stage.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                            {stage.percentageOfLoss}
                            {UI.lossSuffix}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-border/40 text-xs">
                          <span className="text-muted-foreground">{UI.volumeLabel}</span>
                          <span className="font-mono font-bold text-foreground">
                            {stage.lossTonnes} {UI.tonnesUnit}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active Stage Deep-Dive Card */}
                <div className="rounded-2xl p-6 bg-card/80 border border-emerald-500/30 backdrop-blur-md shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
                    <div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        {UI.stageDeepDiveTelemetry}
                      </span>
                      <h3 className="text-lg font-extrabold text-foreground mt-0.5">{activeStage.name}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border/40 text-xs">
                        <span className="text-muted-foreground">{UI.annualLossLabel}</span>
                        <span className="font-bold font-mono text-foreground">{activeStage.economicLoss}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border/40 text-xs">
                        <span className="text-muted-foreground">{UI.ghgShareLabel}</span>
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {activeStage.ghgSharePct}
                          {UI.footprintSuffix}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Primary Root Causes */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <AlertTriangle className="size-4 text-amber-500" />
                        <span>{UI.systemicDriversTitle}</span>
                      </h4>
                      <ul className="space-y-2">
                        {activeStage.primaryDrivers.map((driver) => (
                          <li
                            key={driver}
                            className="text-xs text-muted-foreground flex items-start gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/30"
                          >
                            <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>{driver}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Mitigation Tech & Solutions */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Zap className="size-4 text-emerald-500" />
                        <span>{UI.mitigationSolutionsTitle}</span>
                      </h4>
                      <ul className="space-y-2">
                        {activeStage.mitigationTech.map((tech) => (
                          <li
                            key={tech}
                            className="text-xs text-foreground flex items-start gap-2 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20"
                          >
                            <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{tech}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Asymmetry Profile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40 text-xs">
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/30 space-y-1">
                      <span className="font-bold text-foreground">{UI.highIncomeProfileTitle}</span>
                      <p className="text-muted-foreground leading-relaxed">{activeStage.highIncomeRole}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/30 space-y-1">
                      <span className="font-bold text-foreground">{UI.developingProfileTitle}</span>
                      <p className="text-muted-foreground leading-relaxed">{activeStage.developingRole}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: REGIONAL BENCHMARKS */}
            {activeTab === "regional" && (
              <motion.div
                key="regional-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                      <BarChart3 className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{UI.regionalTitle}</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{UI.regionalSubtitle}</p>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border/50 rounded-xl text-xs font-semibold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setRegionalViewMode("perCapita")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        regionalViewMode === "perCapita"
                          ? "bg-card text-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {UI.perCapitaToggle}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegionalViewMode("totalMass")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        regionalViewMode === "totalMass"
                          ? "bg-card text-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {UI.totalMassToggle}
                    </button>
                  </div>
                </div>

                {/* Accessible Responsive Table Component */}
                <div
                  tabIndex={0}
                  role="region"
                  aria-labelledby="regional-table-caption"
                  className="table-wrapper rounded-2xl border border-border/50 bg-card/75 backdrop-blur-md overflow-x-auto focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <table className="w-full text-start text-xs border-collapse">
                    <caption id="regional-table-caption" className="sr-only">
                      {UI.tableCaption}
                    </caption>
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-md border-b border-border/50 z-10 text-muted-foreground font-semibold">
                      <tr>
                        <th scope="col" className="py-3 px-4 text-start font-bold">
                          {UI.colRegion}
                        </th>
                        <th scope="col" className="py-3 px-4 text-start font-bold">
                          {UI.colEconomicTier}
                        </th>
                        <th scope="col" className="py-3 px-4 text-end font-bold">
                          {UI.colPerCapita}
                        </th>
                        <th scope="col" className="py-3 px-4 text-end font-bold">
                          {UI.colTotalLoss}
                        </th>
                        <th scope="col" className="py-3 px-4 text-start font-bold">
                          {UI.colPrimaryVulnerability}
                        </th>
                        <th scope="col" className="py-3 px-4 text-end font-bold">
                          {UI.colHouseholdShare}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredRegions.map((region) => (
                        <tr key={region.id} className="hover:bg-muted/40 transition-colors">
                          <th scope="row" className="py-3 px-4 text-start font-bold text-foreground">
                            {region.region}
                          </th>
                          <td className="py-3 px-4 text-start text-muted-foreground">
                            <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium">
                              {region.economicTier}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-end font-mono font-bold text-foreground">
                            {region.perCapitaKg} {UI.kgUnit}
                          </td>
                          <td className="py-3 px-4 text-end font-mono font-bold text-foreground">
                            {region.totalLossMt} {UI.mtUnit}
                          </td>
                          <td className="py-3 px-4 text-start text-muted-foreground font-medium">
                            {region.primaryStage}
                          </td>
                          <td className="py-3 px-4 text-end">
                            <div className="inline-flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${region.householdSharePct}%` }}
                                  className="h-full bg-emerald-500 rounded-full"
                                />
                              </div>
                              <span className="font-mono text-muted-foreground">{region.householdSharePct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Regional Highlight Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRegions.slice(0, 3).map((r) => (
                    <div
                      key={`card-${r.id}`}
                      className="p-5 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-sm">{r.region}</span>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {r.perCapitaKg} {UI.kgPerPersonUnit}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {UI.generatesPrefix}
                        {r.totalLossMt}
                        {UI.generatesSuffix}
                        {r.primaryStage}.
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB 4: COMMODITY MATRIX */}
            {activeTab === "commodities" && (
              <motion.div
                key="commodities-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    <Package className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{UI.commoditiesTitle}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{UI.commoditiesSubtitle}</p>
                </div>

                {/* Environmental Disparity Insight */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-card/80 to-card/50 border border-border/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="size-3.5" />
                      <span>{UI.paradoxTitle}</span>
                    </span>
                    <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">{UI.paradoxBody}</p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold shrink-0">
                    {UI.beefStatBadge}
                  </div>
                </div>

                {/* 6 Commodity Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {COMMODITY_MATRIX.map((c) => {
                    const IconComp = c.icon;
                    return (
                      <div
                        key={c.id}
                        className="rounded-2xl p-5 bg-card/75 border border-border/50 backdrop-blur-md shadow-xs flex flex-col justify-between hover:border-emerald-500/30 transition-all space-y-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <IconComp className="size-4" />
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground text-sm">{c.name}</h3>
                              <span className="text-[11px] text-muted-foreground">{c.category}</span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            {c.lossRatePct}
                            {UI.wastedSuffix}
                          </span>
                        </div>

                        <div className="space-y-2 border-t border-border/40 pt-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{UI.volumeLostLabel}</span>
                            <span className="font-mono font-bold text-foreground">
                              {c.annualLossMt} {UI.millionTonnesUnit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{UI.carbonPenaltyLabel}</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {c.carbonIntensity} {UI.co2PerKgUnit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{UI.waterFootprintLabel}</span>
                            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                              {c.waterFootprintLiters.toLocaleString()} {UI.litersPerKgUnit}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-border/40 pt-2">
                          <span className="text-[11px] text-muted-foreground block leading-relaxed">
                            <strong className="text-foreground">{UI.primaryLossNodeLabel}</strong>
                            {c.primaryLossPoint}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* TAB 5: UN SDG 12.3 ROADMAP MODELER */}
            {activeTab === "sdg123" && (
              <motion.div
                key="sdg123-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    <Target className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{UI.sdgModelerTitle}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{UI.sdgModelerSubtitle}</p>
                </div>

                {/* Scenario Controller */}
                <div className="rounded-2xl p-6 bg-gradient-to-br from-emerald-500/10 via-card/80 to-card/50 border border-emerald-500/20 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingDown className="size-3.5" />
                        <span>{UI.scenarioSimulationTitle}</span>
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-foreground">{UI.scenarioMilestonePrompt}</h3>
                      <p className="text-xs text-muted-foreground max-w-xl">{UI.scenarioDescription}</p>
                    </div>

                    {/* Target Selector Buttons */}
                    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/60 border border-border/50 rounded-xl text-xs font-bold">
                      {[10, 25, 50, 60].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setTargetReductionPct(pct)}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            targetReductionPct === pct
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {pct}% {pct === 50 ? UI.unSdgGoalTag : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Projected Dividends */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-card/80 border border-border/40">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        {UI.statFoodRescued}
                      </span>
                      <span className="text-lg sm:text-xl font-extrabold text-foreground font-mono">
                        {simulatedReductionMetrics.divertedTonnesMillions}
                        {UI.statFoodRescuedUnit}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{UI.statFoodRescuedSub}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-card/80 border border-border/40">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        {UI.statCapitalRetained}
                      </span>
                      <span className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        +${simulatedReductionMetrics.capitalSavedBillions}B
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {UI.statCapitalRetainedSub}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-card/80 border border-border/40">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        {UI.statEmissionsAvoided}
                      </span>
                      <span className="text-lg sm:text-xl font-extrabold text-foreground font-mono">
                        {simulatedReductionMetrics.co2AvoidedGigatonnes} {UI.statEmissionsAvoidedUnit}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {UI.statEmissionsAvoidedSub}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-card/80 border border-border/40">
                      <span className="text-[11px] font-semibold text-muted-foreground block">{UI.statWaterSaved}</span>
                      <span className="text-lg sm:text-xl font-extrabold text-sky-600 dark:text-sky-400 font-mono">
                        {simulatedReductionMetrics.waterSavedKm3} {UI.statWaterSavedUnit}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{UI.statWaterSavedSub}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-card/80 border border-border/40 col-span-2 sm:col-span-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        {UI.statPeopleNourished}
                      </span>
                      <span className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {simulatedReductionMetrics.peopleFedMillions}M
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {UI.statPeopleNourishedSub}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2030 Roadmap Milestones */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground">{UI.milestonesTitle}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                      <span className="text-xs font-mono font-bold text-muted-foreground">{UI.m1Tag}</span>
                      <h4 className="font-bold text-foreground text-xs">{UI.m1Title}</h4>
                      <p className="text-[11px] text-muted-foreground">{UI.m1Desc}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {UI.m2Tag}
                      </span>
                      <h4 className="font-bold text-foreground text-xs">{UI.m2Title}</h4>
                      <p className="text-[11px] text-muted-foreground">{UI.m2Desc}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {UI.m3Tag}
                      </span>
                      <h4 className="font-bold text-foreground text-xs">{UI.m3Title}</h4>
                      <p className="text-[11px] text-muted-foreground">{UI.m3Desc}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {UI.m4Tag}
                      </span>
                      <h4 className="font-bold text-foreground text-xs">{UI.m4Title}</h4>
                      <p className="text-[11px] text-muted-foreground">{UI.m4Desc}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 6: GLOBAL POLICY & INTERVENTIONS */}
            {activeTab === "interventions" && (
              <motion.div
                key="interventions-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{UI.interventionsTitle}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{UI.interventionsSubtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {POLICY_INTERVENTIONS.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-card/75 border border-border/50 backdrop-blur-md shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            {item.category}
                          </span>
                          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            {UI.roiPrefix}
                            {item.roiRatio}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>

                      <div className="space-y-2 border-t border-border/40 pt-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{UI.lossPotentialLabel}</span>
                          <span className="font-mono font-bold text-foreground">
                            {UI.upToPrefix}
                            {item.potentialLossReductionPct}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{UI.globalValueLabel}</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {item.globalSavingsUsd}
                            {UI.perYearSuffix}
                          </span>
                        </div>
                        <div className="pt-1">
                          <span className="text-[10px] text-muted-foreground block">
                            {UI.pioneersLabel}
                            {item.pioneerNations.join(", ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB 7: GLOBAL AI ADVISOR */}
            {activeTab === "advisor" && (
              <motion.div
                key="advisor-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{UI.advisorTitle}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{UI.advisorSubtitle}</p>
                </div>

                <AdvisorChat
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  isChatLoading={isChatLoading}
                  apiWarning={null}
                  onSetChatInput={setChatInput}
                  onSendChatMessage={handleSendChatMessage}
                  onClearChat={handleClearChat}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-6 border-t border-border/40 text-center text-xs text-muted-foreground space-y-1 mt-12 w-full">
        <p className="font-semibold text-foreground/80">{UI.footerTitle}</p>
        <p className="text-[11px] text-muted-foreground">{UI.footerSubtitle}</p>
      </footer>
    </div>
  );
}
