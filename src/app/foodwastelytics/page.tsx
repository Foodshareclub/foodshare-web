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
  Award,
  BarChart2,
  BarChart3,
  Beef,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  Cpu,
  DollarSign,
  Download,
  Droplet,
  Fish,
  Flame,
  Globe,
  Info,
  Layers,
  Layout,
  Leaf,
  Milk,
  Package,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  ThermometerSnowflake,
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
export type LayoutVariant = "landing" | "dashboard" | "storyboard";

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
  carbonIntensity: number; // kg CO2e per kg lost
  waterFootprintLiters: number; // liters per kg lost
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
  variantLanding: "Landing Page (Editorial)",
  variantDashboard: "Executive Suite (Tabbed)",
  variantStoryboard: "Infographic Story",
  sdgBadge: "UN SDG 12.3 Target (2030)",
  exportDownloaded: "Brief Downloaded!",
  exportButton: "Export Intelligence Brief",
  macroSectionTitle: "The Planetary Food Loss Crisis",
  macroSectionSubtitle:
    "Empirical benchmarks across physical volume, macroeconomic capital, greenhouse gas forcing, and freshwater depletion.",
  boundariesTitle: "Planetary Boundaries & Human Caloric Bridge",
  boundariesSubtitle:
    "Comparing agricultural resources squandered on discarded food with global humanitarian nutrition deficits.",
  championsLabel: "Champions 12.3 Synthesis",
  arableLandTitle: "Arable Land Footprint",
  arableLandValue: "1.40 Billion ha",
  arableLandDesc: "28% of total global agricultural land is farmed for crops that are never consumed.",
  hungerCapacityTitle: "Hunger Elimination Caloric Bridge",
  hungerCapacityValue: "1.26 Billion People",
  hungerCapacityDesc:
    "Nutritional calories lost could feed almost double the 735 million undernourished people worldwide.",
  methaneTitle: "Municipal Methane Forcing",
  methaneValue: "20% Methane",
  methaneDesc: "One-fifth of all global municipal solid waste methane emanates from decomposing organic food.",
  fertilizerTitle: "Lost Synthetic Fertilizer",
  fertilizerValue: "23.4M Tonnes",
  fertilizerDesc: "Nitrogen, phosphorus, and potassium inputs washed away annually, fueling coastal hypoxia.",
  flowTitle: "Farm-to-Fork Supply Chain Loss Flow",
  flowSubtitle:
    "Tracing where the 1.32 Billion Tonnes are lost along the agricultural supply chain from initial harvest to consumer consumption.",
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
  bulletBullet: "• ",
  layoutVariantLabel: "Layout Presentation Variant:",
  championsBadge: "Champions 12.3 Verified",
  mappedBadge: "1.32B Tonnes Mapped",
  lossDriversHeading: "Loss Drivers & Insights:",
  leversHeading: "Implementation Levers:",
  pctWasted: "% Wasted",
  savedLabel: "Saved",
  retainedLabel: "Retained",
  storyBadge: "International Sustainability Narrative",
  storyTitle: "The Journey of Planetary Food Loss to 2030 Recovery",
  storyDesc:
    "Follow the 4-act infographic trajectory from the global crisis to systemic supply-chain interventions and UN SDG 12.3 fulfillment.",
  act1Title: "Act I: The Global Discard Scale",
  act1Text1:
    "Every year, human civilization cultivates 4.0 Billion tonnes of agricultural output, but completely abandons ",
  act1Highlight: "1.32 Billion tonnes",
  act1Text2: " before it can nourish a human body.",
  act1Card1Title: "Physical Burden",
  act1Card1Val: "1.32B Tonnes",
  act1Card2Title: "Economic Erasure",
  act1Card2Val: "$1.05T USD",
  act1Card3Title: "Emissions Forcing",
  act1Card3Val: "3.80 Gt CO₂e",
  act2Title: "Act II: The Asymmetric Supply Chain",
  act2Text:
    "Food is lost in fundamentally different locations depending on national wealth. In developing economies, crops perish at farm gates due to unbroken solar cold-chain absence. In high-income nations, edible food is culled at supermarkets for minor cosmetic flaws and discarded in residential kitchens due to confusing date labels.",
  act3Title: "Act III: The UN SDG 12.3 Planetary Dividend",
  act3Text1:
    "Halving retail and consumer food waste while slashing post-harvest losses delivers the fastest climate dividend on Earth: ",
  act3Highlight1: "660 Million Tonnes",
  act3Text2: " of wholesome nutrition rescued, ",
  act3Highlight2: "1.9 GigaTonnes of CO₂e",
  act3Text3: " mitigated, and ",
  act3Highlight3: "+$525 Billion USD",
  act3Text4: " returned to the global economy.",
};

const GLOBAL_MACRO_INDICATORS: MacroIndicator[] = [
  {
    id: "edible-mass",
    label: "Global Edible Food Discarded",
    value: "1.32",
    unit: "Billion Tonnes / yr",
    badge: "33.3% Global Harvest",
    bullets: [
      "Approximately one-third of all food produced across the planet is never eaten.",
      "Weighs more than the entire global human population combined 3× over.",
      "Contains enough calories to reliably nourish 1.26 Billion people annually.",
    ],
    icon: Scale,
    accent: "amber",
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
  },
  {
    id: "economic-loss",
    label: "Direct Economic Loss",
    value: "$1.05",
    unit: "Trillion USD / yr",
    badge: "1.2% Global GDP",
    bullets: [
      "Direct capital penalty across agriculture, harvest loss, and retail supply chains.",
      "Rises to $2.6 Trillion USD annually when full environmental externalities are priced.",
      "Equivalent to erasing the combined GDP of Switzerland and the Netherlands every year.",
    ],
    icon: DollarSign,
    accent: "rose",
    gradient: "from-rose-500/15 via-rose-500/5 to-transparent",
  },
  {
    id: "ghg-emissions",
    label: "Greenhouse Gas Penalty",
    value: "3.80",
    unit: "GigaTonnes CO₂e / yr",
    badge: "#3 Emitter Globally",
    bullets: [
      "Accounts for 8% to 10% of total anthropogenic emissions across the biosphere.",
      "If food waste were an independent nation, it would be the #3 emitter behind China and the USA.",
      "Generates 20% of all municipal landfill methane emissions worldwide.",
    ],
    icon: Flame,
    accent: "emerald",
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
  },
  {
    id: "freshwater",
    label: "Irrigation Freshwater Lost",
    value: "252",
    unit: "km³ Water / yr",
    badge: "24% Agri Water",
    bullets: [
      "Equal to 3 times the volume of Lake Geneva consumed for unconsumed crops.",
      "Represents approximately 24% of all freshwater extracted for agriculture.",
      "1.40 Billion hectares of arable land (28% of world farms) farmed in vain.",
    ],
    icon: Droplet,
    accent: "sky",
    gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
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
      "Strict aesthetic cosmetic grading requirements causing field discards",
      "Pest, pathogen, and extreme weather shocks during harvest window",
      "Market price dips causing unharvested acreage",
      "Labor shortages and mechanical harvesting crop damage",
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
      "Inadequate rural cold-chain infrastructure and refrigerated transport",
      "Unsealed grain silos exposed to moisture, mold, and rodents",
      "Severe ambient heat and humidity during overland transit",
      "Unpaved rural roads prolonging transit duration",
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
    keyTakeaway: "Consumer discard and restaurant portion sizing drive >60% of the entire waste stream.",
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
    keyTakeaway: "Strict packaging regulations and grocery cosmetic standards drive industrial culling.",
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
    keyTakeaway: "Generous hospitality traditions and large buffet presentations create major post-event discards.",
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
    keyTakeaway: "Transport delays over mountainous terrain and port bottlenecks drive export losses.",
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
    keyTakeaway: "Rapid urbanization is shifting waste from traditional village storage to supermarket aisles.",
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
    keyTakeaway: "Up to 50% of fresh horticultural crops rot before market due to absence of cold storage.",
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
    keyTakeaway: "Inadequate grain silo storage causes massive losses to humidity, weevils, and mold.",
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
    bullets: [
      "Highest physical volume of waste across the global food system (490 Million Tonnes).",
      "Extremely susceptible to transit heat, physical bruising, and retail cosmetical grading.",
      "Accounts for 470 Billion m³ of wasted agricultural irrigation water.",
    ],
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
    bullets: [
      "Severe mechanical damage during harvest leads to rapid fungal contamination.",
      "Cassava and yams suffer rapid physiological deterioration within 48 hours.",
      "Low economic value per kilo disincentivizes modern climate-controlled transit.",
    ],
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
    bullets: [
      "Up to 10 Million Tonnes discarded at sea as unwanted commercial bycatch.",
      "Extremely perishable protein requiring unbroken sub-zero ice storage.",
      "Wasted seafood represents an irreversible depletion of wild marine ecosystems.",
    ],
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
    bullets: [
      "Inadequate drying in tropical zones leads to toxic aflatoxin contamination.",
      "Rodents and insect pests consume up to 20% of stored farm harvests.",
      "Massive industrial bakery and restaurant rice plate discards.",
    ],
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
    bullets: [
      "High emissions intensity: 3.2 kg CO₂e per single liter of milk discarded.",
      "High water footprint: 3,100 liters of water embedded in 1 kg of dairy products.",
      "Strict retail sell-by dates cause massive supermarket inventory write-offs.",
    ],
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
    bullets: [
      "The ultimate emissions driver: 1 kg of discarded beef generates 18.5 kg CO₂e.",
      "Requires 15,400 liters of water per kilogram — highest natural resource intensity on Earth.",
      "Represents over 50% of total food waste greenhouse gas footprint despite small mass.",
    ],
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
    bullets: [
      "Standardizes phrases across all 50 US states and EU member nations.",
      "Removes quality dates entirely from shelf-stable produce (e.g. Tesco & M&S produce initiative).",
      "Delivers the highest benefit-cost ratio ($14 return for every $1 invested).",
    ],
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
    bullets: [
      "Extends fruit and vegetable shelf-life from 2 days to over 21 days.",
      "Employs thermal phase-change energy storage for 24/7 cooling without diesel generators.",
      "Enables smallholders to pay small daily crate fees (~$0.50), increasing farm revenue by 50%.",
    ],
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
    bullets: [
      "Eliminates corporate litigation fears when donating wholesome unsold inventory.",
      "France requires supermarkets >400m² to contract with accredited foodbanks or face €10,000 fines.",
      "Provides enhanced corporate tax deductions matching fair market inventory value.",
    ],
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
    bullets: [
      "Uses real-time checkout velocity and expiration data to automate progressive discounts.",
      "Connects seamlessly to local community food sharing apps (FoodShare APIs).",
      "Recovers grocery store profit margins while reducing organic bin weight.",
    ],
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
    bullets: [
      "South Korea achieved 98% food waste recycling through pay-as-you-throw smart bins.",
      "Captures biogenic methane for municipal electricity and district heating.",
      "Generates nutrient-rich organic compost to replenish degraded agricultural topsoil.",
    ],
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

  // Layout Variant Selector: "landing" (Editorial Long-Form Landing Page), "dashboard" (Tabbed Executive Suite), "storyboard" (Visual Story)
  const [layoutVariant, setLayoutVariant] = useState<LayoutVariant>("landing");

  // Active tab (for dashboard variant)
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
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
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

        {/* Layout Variant Switcher Subheader */}
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-border/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Layout className="size-4 text-emerald-500" />
            <span>{UI.layoutVariantLabel}</span>
          </div>
          <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLayoutVariant("landing")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                layoutVariant === "landing"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>{UI.variantLanding}</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutVariant("dashboard")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                layoutVariant === "dashboard"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart2 className="size-3.5" />
              <span>{UI.variantDashboard}</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutVariant("storyboard")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                layoutVariant === "storyboard"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="size-3.5" />
              <span>{UI.variantStoryboard}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* VARIANT A: EDITORIAL LANDING PAGE (Continuous Scroll & Bullets) */}
      {/* ============================================================== */}
      {layoutVariant === "landing" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-16">
          {/* SECTION 1: MACRO INDICATORS BENTO GRID */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/40 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
                  <Globe className="size-6 text-emerald-500" />
                  <span>{UI.macroSectionTitle}</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.macroSectionSubtitle}</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                {UI.championsBadge}
              </span>
            </div>

            {/* 4 Colossal Bento Cards with Key Bulletpoints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {GLOBAL_MACRO_INDICATORS.map((metric) => {
                const IconComponent = metric.icon;
                return (
                  <div
                    key={metric.id}
                    className="rounded-3xl p-6 sm:p-8 bg-card/80 border border-border/50 backdrop-blur-xl shadow-lg hover:border-emerald-500/40 hover:shadow-emerald-500/5 transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden"
                  >
                    <div
                      className={`absolute -end-16 -bottom-16 w-52 h-52 bg-gradient-to-br ${metric.gradient} rounded-full blur-3xl pointer-events-none`}
                    />
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                          {metric.label}
                        </span>
                        <div className="size-10 rounded-xl bg-muted/60 text-emerald-600 dark:text-emerald-400 border border-border/40 flex items-center justify-center shrink-0">
                          <IconComponent className="size-5" />
                        </div>
                      </div>

                      <div className="flex items-baseline gap-3 my-2">
                        <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground font-mono">
                          {metric.value}
                        </span>
                        <span className="text-sm sm:text-base font-bold text-muted-foreground uppercase tracking-wider">
                          {metric.unit}
                        </span>
                      </div>
                    </div>

                    {/* Bulletpoints Container */}
                    <div className="space-y-2.5 pt-4 border-t border-border/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 self-start inline-block">
                        {metric.badge}
                      </span>
                      <ul className="space-y-2 mt-2">
                        {metric.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="text-xs text-muted-foreground flex items-start gap-2.5 leading-relaxed"
                          >
                            <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: PLANETARY BOUNDARIES & HUMANITARIAN IMPACT */}
          <section className="rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-card/90 via-card/60 to-card/40 border border-border/50 backdrop-blur-xl shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  <Compass className="size-5 text-emerald-500" />
                  <span>{UI.boundariesTitle}</span>
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{UI.boundariesSubtitle}</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-foreground border border-border/40">
                {UI.championsLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-2xl bg-card/60 border border-border/40 space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  {UI.arableLandTitle}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-foreground font-mono block">
                  {UI.arableLandValue}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{UI.arableLandDesc}</p>
              </div>

              <div className="p-5 rounded-2xl bg-card/60 border border-emerald-500/30 space-y-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  {UI.hungerCapacityTitle}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                  {UI.hungerCapacityValue}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{UI.hungerCapacityDesc}</p>
              </div>

              <div className="p-5 rounded-2xl bg-card/60 border border-border/40 space-y-2">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block">
                  {UI.methaneTitle}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono block">
                  {UI.methaneValue}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{UI.methaneDesc}</p>
              </div>

              <div className="p-5 rounded-2xl bg-card/60 border border-border/40 space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  {UI.fertilizerTitle}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-foreground font-mono block">
                  {UI.fertilizerValue}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{UI.fertilizerDesc}</p>
              </div>
            </div>
          </section>

          {/* SECTION 3: FARM-TO-FORK SUPPLY CHAIN LOSS FLOW */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/40 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
                  <Layers className="size-6 text-emerald-500" />
                  <span>{UI.flowTitle}</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.flowSubtitle}</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                {UI.mappedBadge}
              </span>
            </div>

            {/* Pipeline Visual Ribbon */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
                <span>{UI.streamOutput}</span>
                <span>{UI.streamDiverted}</span>
              </div>
              <div className="h-7 w-full rounded-2xl bg-muted/60 overflow-hidden flex p-1 gap-1 border border-border/50">
                {SUPPLY_CHAIN_STAGES.map((stg) => (
                  <button
                    type="button"
                    key={stg.id}
                    onClick={() => setSelectedStageId(stg.id)}
                    style={{ width: `${stg.percentageOfLoss}%` }}
                    className={`h-full rounded-xl transition-all cursor-pointer relative group ${
                      selectedStageId === stg.id
                        ? "bg-emerald-600 shadow-md ring-2 ring-emerald-500/40"
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

            {/* Stage Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {SUPPLY_CHAIN_STAGES.map((stage) => {
                const isSelected = selectedStageId === stage.id;
                return (
                  <button
                    type="button"
                    key={stage.id}
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`p-4 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-card border-emerald-500 ring-1 ring-emerald-500/40 shadow-md"
                        : "bg-card/60 hover:bg-card border-border/50"
                    }`}
                  >
                    <div className="space-y-1 mb-2">
                      <span className="text-xs font-bold text-foreground block">{stage.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold inline-block">
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
            <div className="rounded-3xl p-6 sm:p-8 bg-card/85 border border-emerald-500/30 backdrop-blur-xl shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    {UI.stageDeepDiveTelemetry}
                  </span>
                  <h3 className="text-xl font-extrabold text-foreground mt-0.5">{activeStage.name}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-muted/60 border border-border/40 text-xs">
                    <span className="text-muted-foreground">{UI.annualLossLabel}</span>
                    <span className="font-bold font-mono text-foreground">{activeStage.economicLoss}</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-muted/60 border border-border/40 text-xs">
                    <span className="text-muted-foreground">{UI.ghgShareLabel}</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {activeStage.ghgSharePct}
                      {UI.footprintSuffix}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Systemic Drivers with Bulletpoints */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" />
                    <span>{UI.systemicDriversTitle}</span>
                  </h4>
                  <ul className="space-y-2.5">
                    {activeStage.primaryDrivers.map((driver) => (
                      <li
                        key={driver}
                        className="text-xs text-muted-foreground flex items-start gap-2.5 bg-muted/30 p-3 rounded-xl border border-border/30 leading-relaxed"
                      >
                        <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mitigation Solutions with Bulletpoints */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Zap className="size-4 text-emerald-500" />
                    <span>{UI.mitigationSolutionsTitle}</span>
                  </h4>
                  <ul className="space-y-2.5">
                    {activeStage.mitigationTech.map((tech) => (
                      <li
                        key={tech}
                        className="text-xs text-foreground flex items-start gap-2.5 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 leading-relaxed"
                      >
                        <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{tech}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: UNEP REGIONAL BENCHMARKS */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-border/40 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
                  <BarChart3 className="size-6 text-emerald-500" />
                  <span>{UI.regionalTitle}</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.regionalSubtitle}</p>
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
              className="table-wrapper rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-x-auto focus:outline-none focus:ring-2 focus:ring-emerald-500/40 shadow-lg"
            >
              <table className="w-full text-start text-xs border-collapse">
                <caption id="regional-table-caption" className="sr-only">
                  {UI.tableCaption}
                </caption>
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-md border-b border-border/50 z-10 text-muted-foreground font-semibold">
                  <tr>
                    <th scope="col" className="py-3.5 px-5 text-start font-bold">
                      {UI.colRegion}
                    </th>
                    <th scope="col" className="py-3.5 px-5 text-start font-bold">
                      {UI.colEconomicTier}
                    </th>
                    <th scope="col" className="py-3.5 px-5 text-end font-bold">
                      {UI.colPerCapita}
                    </th>
                    <th scope="col" className="py-3.5 px-5 text-end font-bold">
                      {UI.colTotalLoss}
                    </th>
                    <th scope="col" className="py-3.5 px-5 text-start font-bold">
                      {UI.colPrimaryVulnerability}
                    </th>
                    <th scope="col" className="py-3.5 px-5 text-end font-bold">
                      {UI.colHouseholdShare}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredRegions.map((region) => (
                    <tr key={region.id} className="hover:bg-muted/40 transition-colors">
                      <th scope="row" className="py-3.5 px-5 text-start font-bold text-foreground">
                        {region.region}
                      </th>
                      <td className="py-3.5 px-5 text-start text-muted-foreground">
                        <span className="px-2.5 py-0.5 rounded-md bg-muted text-[11px] font-medium">
                          {region.economicTier}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-end font-mono font-bold text-foreground">
                        {region.perCapitaKg} {UI.kgUnit}
                      </td>
                      <td className="py-3.5 px-5 text-end font-mono font-bold text-foreground">
                        {region.totalLossMt} {UI.mtUnit}
                      </td>
                      <td className="py-3.5 px-5 text-start text-muted-foreground font-medium">
                        {region.primaryStage}
                      </td>
                      <td className="py-3.5 px-5 text-end">
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
          </section>

          {/* SECTION 5: COMMODITY VULNERABILITY MATRIX & PARADOX */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/40 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
                  <Package className="size-6 text-emerald-500" />
                  <span>{UI.commoditiesTitle}</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.commoditiesSubtitle}</p>
              </div>
            </div>

            {/* Paradox Callout Banner with Bullet Points */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-card/90 via-card/60 to-card/40 border border-border/50 backdrop-blur-xl shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <Flame className="size-4" />
                  <span>{UI.paradoxTitle}</span>
                </span>
                <span className="px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold self-start sm:self-auto">
                  {UI.beefStatBadge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-4xl">{UI.paradoxBody}</p>
            </div>

            {/* 6 Commodity Cards with Key Bulletpoints */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {COMMODITY_MATRIX.map((c) => {
                const IconComp = c.icon;
                return (
                  <div
                    key={c.id}
                    className="rounded-3xl p-6 bg-card/80 border border-border/50 backdrop-blur-xl shadow-md flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300 space-y-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <IconComp className="size-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-foreground text-sm sm:text-base">{c.name}</h3>
                            <span className="text-xs text-muted-foreground">{c.category}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          {c.lossRatePct}
                          {UI.wastedSuffix}
                        </span>
                      </div>

                      <div className="space-y-1.5 border-t border-border/40 pt-3 mt-3 text-xs">
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
                    </div>

                    {/* Bulletpoints */}
                    <div className="space-y-2 border-t border-border/40 pt-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        {UI.lossDriversHeading}
                      </span>
                      <ul className="space-y-1.5">
                        {c.bullets.map((b) => (
                          <li
                            key={b}
                            className="text-[11px] text-muted-foreground flex items-start gap-2 leading-relaxed"
                          >
                            <span className="size-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 6: UN SDG 12.3 2030 HALVING SCENARIO MODELER */}
          <section className="rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-emerald-500/10 via-card/85 to-card/50 border border-emerald-500/25 shadow-xl space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <Target className="size-4" />
                  <span>{UI.scenarioSimulationTitle}</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-foreground">{UI.scenarioMilestonePrompt}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">{UI.scenarioDescription}</p>
              </div>

              {/* Target Selector Buttons */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/60 border border-border/50 rounded-xl text-xs font-bold">
                {[10, 25, 50, 60].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTargetReductionPct(pct)}
                    className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                      targetReductionPct === pct
                        ? "bg-emerald-600 text-white shadow-md font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {pct}% {pct === 50 ? UI.unSdgGoalTag : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Projected Dividends Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">{UI.statFoodRescued}</span>
                <span className="text-2xl sm:text-3xl font-black text-foreground font-mono block">
                  {simulatedReductionMetrics.divertedTonnesMillions}
                  {UI.statFoodRescuedUnit}
                </span>
                <span className="text-[11px] text-muted-foreground block">{UI.statFoodRescuedSub}</span>
              </div>

              <div className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">{UI.statCapitalRetained}</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                  +${simulatedReductionMetrics.capitalSavedBillions}B
                </span>
                <span className="text-[11px] text-muted-foreground block">{UI.statCapitalRetainedSub}</span>
              </div>

              <div className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">{UI.statEmissionsAvoided}</span>
                <span className="text-2xl sm:text-3xl font-black text-foreground font-mono block">
                  {simulatedReductionMetrics.co2AvoidedGigatonnes} {UI.statEmissionsAvoidedUnit}
                </span>
                <span className="text-[11px] text-muted-foreground block">{UI.statEmissionsAvoidedSub}</span>
              </div>

              <div className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">{UI.statWaterSaved}</span>
                <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 font-mono block">
                  {simulatedReductionMetrics.waterSavedKm3} {UI.statWaterSavedUnit}
                </span>
                <span className="text-[11px] text-muted-foreground block">{UI.statWaterSavedSub}</span>
              </div>

              <div className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-xs space-y-1 col-span-2 sm:col-span-1">
                <span className="text-xs font-semibold text-muted-foreground block">{UI.statPeopleNourished}</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                  {simulatedReductionMetrics.peopleFedMillions}M
                </span>
                <span className="text-[11px] text-muted-foreground block">{UI.statPeopleNourishedSub}</span>
              </div>
            </div>

            {/* 2030 Roadmap Milestones */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <h4 className="text-sm font-bold text-foreground">{UI.milestonesTitle}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-card/60 border border-border/40 space-y-1.5">
                  <span className="text-xs font-mono font-bold text-muted-foreground">{UI.m1Tag}</span>
                  <h5 className="font-bold text-foreground text-xs">{UI.m1Title}</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{UI.m1Desc}</p>
                </div>

                <div className="p-4 rounded-2xl bg-card/60 border border-border/40 space-y-1.5">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{UI.m2Tag}</span>
                  <h5 className="font-bold text-foreground text-xs">{UI.m2Title}</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{UI.m2Desc}</p>
                </div>

                <div className="p-4 rounded-2xl bg-card/60 border border-border/40 space-y-1.5">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{UI.m3Tag}</span>
                  <h5 className="font-bold text-foreground text-xs">{UI.m3Title}</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{UI.m3Desc}</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{UI.m4Tag}</span>
                  <h5 className="font-bold text-foreground text-xs">{UI.m4Title}</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{UI.m4Desc}</p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 7: HIGH-IMPACT POLICY INTERVENTIONS */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/40 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
                  <ShieldCheck className="size-6 text-emerald-500" />
                  <span>{UI.interventionsTitle}</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.interventionsSubtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {POLICY_INTERVENTIONS.map((item) => (
                <div
                  key={item.id}
                  className="p-6 rounded-3xl bg-card/80 border border-border/50 backdrop-blur-xl shadow-md flex flex-col justify-between space-y-5 hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {item.category}
                      </span>
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {UI.roiPrefix}
                        {item.roiRatio}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>

                  {/* Bulletpoints */}
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      {UI.leversHeading}
                    </span>
                    <ul className="space-y-1.5">
                      {item.bullets.map((b) => (
                        <li key={b} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                          <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
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
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 8: GLOBAL AI INTELLIGENCE ADVISOR */}
          <section className="space-y-6">
            <div className="border-b border-border/40 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
                <Sparkles className="size-6 text-emerald-500" />
                <span>{UI.advisorTitle}</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.advisorSubtitle}</p>
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
          </section>
        </main>
      )}

      {/* ============================================================== */}
      {/* VARIANT B: EXECUTIVE DASHBOARD SUITE (Sidebar Navigation Tabs) */}
      {/* ============================================================== */}
      {layoutVariant === "dashboard" && (
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
              {activeTab === "overview" && (
                <motion.div
                  key="tab-overview"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {GLOBAL_MACRO_INDICATORS.map((metric) => {
                      const IconComponent = metric.icon;
                      return (
                        <div
                          key={metric.id}
                          className="rounded-2xl p-5 bg-card/75 border border-border/50 backdrop-blur-md shadow-xs flex flex-col justify-between"
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
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {activeTab === "supply-chain" && (
                <motion.div
                  key="tab-supply-chain"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-foreground">{UI.flowTitle}</h3>
                  <div className="space-y-2">
                    <div className="h-6 w-full rounded-xl bg-muted/60 overflow-hidden flex p-1 gap-1 border border-border/50">
                      {SUPPLY_CHAIN_STAGES.map((stg) => (
                        <button
                          type="button"
                          key={stg.id}
                          onClick={() => setSelectedStageId(stg.id)}
                          style={{ width: `${stg.percentageOfLoss}%` }}
                          className={`h-full rounded-lg transition-all cursor-pointer ${
                            selectedStageId === stg.id ? "bg-emerald-600 shadow-xs" : "bg-emerald-500/25"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl p-6 bg-card/80 border border-emerald-500/30 space-y-4">
                    <h4 className="font-extrabold text-foreground">{activeStage.name}</h4>
                    <p className="text-xs text-muted-foreground">{activeStage.highIncomeRole}</p>
                  </div>
                </motion.div>
              )}

              {activeTab === "regional" && (
                <motion.div
                  key="tab-regional"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-foreground">{UI.regionalTitle}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredRegions.map((r) => (
                      <div key={r.id} className="p-4 rounded-xl bg-card border border-border/40 space-y-1">
                        <span className="font-bold text-foreground block">{r.region}</span>
                        <span className="text-xs font-mono text-emerald-500">
                          {r.perCapitaKg} {UI.kgUnit}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "commodities" && (
                <motion.div
                  key="tab-commodities"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-foreground">{UI.commoditiesTitle}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {COMMODITY_MATRIX.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl bg-card border border-border/40 space-y-1">
                        <span className="font-bold text-foreground block">{c.name}</span>
                        <span className="text-xs text-rose-500 font-bold">
                          {c.lossRatePct}
                          {UI.pctWasted}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "sdg123" && (
                <motion.div
                  key="tab-sdg123"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-foreground">{UI.sdgModelerTitle}</h3>
                  <div className="p-6 rounded-2xl bg-card border border-emerald-500/25 space-y-3">
                    <span className="text-2xl font-bold font-mono">
                      {simulatedReductionMetrics.divertedTonnesMillions}
                      {UI.statFoodRescuedUnit} {UI.savedLabel}
                    </span>
                    <span className="text-sm font-bold text-emerald-500 block">
                      {`+$${simulatedReductionMetrics.capitalSavedBillions}${UI.billionUnit} ${UI.retainedLabel}`}
                    </span>
                  </div>
                </motion.div>
              )}

              {activeTab === "interventions" && (
                <motion.div
                  key="tab-interventions"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-foreground">{UI.interventionsTitle}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {POLICY_INTERVENTIONS.map((item) => (
                      <div key={item.id} className="p-4 rounded-xl bg-card border border-border/40 space-y-1">
                        <span className="font-bold text-foreground block">{item.title}</span>
                        <span className="text-xs text-emerald-500 font-bold">
                          {UI.roiPrefix}
                          {item.roiRatio}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "advisor" && (
                <motion.div
                  key="tab-advisor"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-bold text-foreground">{UI.advisorTitle}</h3>
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
      )}

      {/* ============================================================== */}
      {/* VARIANT C: INFOGRAPHIC STORYBOARD (Step-by-Step Visual Journey) */}
      {/* ============================================================== */}
      {layoutVariant === "storyboard" && (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-16">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">{UI.storyBadge}</span>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">{UI.storyTitle}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">{UI.storyDesc}</p>
          </div>

          {/* Act 1: The Planetary Extent */}
          <div className="p-8 rounded-3xl bg-card/90 border border-border/50 backdrop-blur-xl shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <span className="size-8 rounded-full bg-emerald-500/20 text-emerald-500 font-black flex items-center justify-center text-sm font-mono">
                {"1"}
              </span>
              <h3 className="text-lg font-extrabold text-foreground">{UI.act1Title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {UI.act1Text1}
              <strong>{UI.act1Highlight}</strong>
              {UI.act1Text2}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <span className="text-xs text-muted-foreground block">{UI.act1Card1Title}</span>
                <span className="text-xl font-bold font-mono">{UI.act1Card1Val}</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <span className="text-xs text-muted-foreground block">{UI.act1Card2Title}</span>
                <span className="text-xl font-bold font-mono text-rose-500">{UI.act1Card2Val}</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <span className="text-xs text-muted-foreground block">{UI.act1Card3Title}</span>
                <span className="text-xl font-bold font-mono text-emerald-500">{UI.act1Card3Val}</span>
              </div>
            </div>
          </div>

          {/* Act 2: Supply Chain Leakage */}
          <div className="p-8 rounded-3xl bg-card/90 border border-border/50 backdrop-blur-xl shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <span className="size-8 rounded-full bg-emerald-500/20 text-emerald-500 font-black flex items-center justify-center text-sm font-mono">
                {"2"}
              </span>
              <h3 className="text-lg font-extrabold text-foreground">{UI.act2Title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{UI.act2Text}</p>
          </div>

          {/* Act 3: The 2030 Halving Dividend */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-card/85 to-card/50 border border-emerald-500/30 backdrop-blur-xl shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <span className="size-8 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-sm font-mono">
                {"3"}
              </span>
              <h3 className="text-lg font-extrabold text-foreground">{UI.act3Title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {UI.act3Text1}
              <strong>{UI.act3Highlight1}</strong>
              {UI.act3Text2}
              <strong>{UI.act3Highlight2}</strong>
              {UI.act3Text3}
              <strong>{UI.act3Highlight3}</strong>
              {UI.act3Text4}
            </p>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-6 border-t border-border/40 text-center text-xs text-muted-foreground space-y-1 mt-12 w-full">
        <p className="font-semibold text-foreground/80">{UI.footerTitle}</p>
        <p className="text-[11px] text-muted-foreground">{UI.footerSubtitle}</p>
      </footer>
    </div>
  );
}
