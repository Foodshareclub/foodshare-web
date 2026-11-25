import { FoodwastelyticsClient } from "@/components/foodwastelytics/FoodwastelyticsClient";
import { generatePageMetadata } from "@/lib/metadata";

export type {
  CommodityVulnerability,
  EconomicScope,
  LayoutVariant,
  MacroIndicator,
  PolicyIntervention,
  RegionalMetric,
  SupplyChainStage,
} from "@/lib/foodwastelytics/types";

export const metadata = generatePageMetadata({
  title: "Foodwastelytics — Global Food Waste Intelligence",
  description:
    "Planetary food loss accounting, global agricultural supply chain benchmarks, and UN SDG 12.3 2030 halving models across world economies.",
  keywords: ["food waste analytics", "UN SDG 12.3", "UNEP food waste index", "sustainability"],
  path: "/foodwastelytics",
});

export default function FoodwastelyticsPage() {
  return <FoodwastelyticsClient />;
}
