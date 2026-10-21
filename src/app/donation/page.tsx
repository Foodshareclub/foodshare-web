import bracketsDown from "@/assets/bracketsDown.png";
import bracketsUp from "@/assets/bracketsUp.png";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Check, HandHeart, Heart, Leaf, Star, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

import { type PublicStats, getPublicStats } from "@/lib/data/public-stats";
import { generatePageMetadata } from "@/lib/metadata";
import { makeGroupedFormatter } from "@/lib/numbers";
import { createRequestLogger } from "@/lib/structured-logger";

import { DonateButton } from "./DonateButton";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("Donation"), getLocale()]);

  return generatePageMetadata({
    title: t("meta_title"),
    description: t("meta_description"),
    // Keywords stay English on purpose — the /help precedent. They are an
    // indexing hint, never rendered on the page.
    keywords: ["donate", "donation", "support foodshare", "food rescue donation", "ko-fi"],
    path: "/donation",
    locale,
  });
}

const KOFI_URL = "https://ko-fi.com/organicnz";

/**
 * The two trust indicators that are statements of policy, plus the one that is
 * a fact.
 *
 * This row used to read "Secure · 100% Goes to Food Rescue · Tax Deductible".
 * The third was false: FoodShare is FOODSHARE CLUB LIMITED (UK 14023669), a
 * registered *company*, and UK donor tax relief — Gift Aid — is only available
 * when the recipient is a registered charity or a CASC, which this is not. On the
 * page that asks for money, that is the claim a regulator and an advertiser's
 * brand-safety team would both look at first.
 *
 * It is replaced by the company registration number, which is a stronger
 * signal than the claim it replaces: anyone can look it up at Companies House,
 * whereas "tax deductible" asked to be believed. See PHASAL_PLAN.md §22.
 */
const TRUST_BADGES = [
  { key: "trust_secure", Icon: Check },
  { key: "trust_impact", Icon: Check },
  { key: "trust_registered", Icon: Check },
] as const;

/**
 * The impact cards.
 *
 * Only one of the three carries a number, and it is a number this page reads
 * from the database. The other two are a stated policy (`100%`) and a stated
 * goal (`Zero`) — the goal says "Goal" in its own label precisely because it is
 * not a measurement, and a page that blurred that line would be the same defect
 * as the one this replaced.
 *
 * `Card`, `TintedCard` and `MeasuredCard` exist so that a card showing a
 * measured figure cannot be built by forgetting to render a number: the type of
 * the `value` is the difference between a literal and a resolved one.
 */
type Value =
  /** A symbol that means the same in every locale, so there is nothing to translate. */
  | { kind: "symbol" }
  /** A word that stands for a figure, and so is a real translation. */
  | { kind: "word"; key: string }
  /** A figure read from the database, formatted for the resolved locale. */
  | { kind: "measured"; from: (stats: PublicStats) => number };

const CARDS: ReadonlyArray<{
  id: string;
  Icon: LucideIcon;
  accent: "pink" | "blue" | "green";
  value: Value;
  titleKey: string;
  bodyKey: string;
}> = [
  {
    id: "direct",
    Icon: HandHeart,
    accent: "pink",
    value: { kind: "symbol" },
    titleKey: "impact_direct_title",
    bodyKey: "impact_direct_body",
  },
  {
    id: "members",
    Icon: Users,
    accent: "blue",
    value: { kind: "measured", from: (s) => s.members },
    titleKey: "impact_members_title",
    bodyKey: "impact_members_body",
  },
  {
    id: "waste",
    Icon: Leaf,
    accent: "green",
    value: { kind: "word", key: "impact_waste_value" },
    titleKey: "impact_waste_title",
    bodyKey: "impact_waste_body",
  },
] as const;

export default async function DonationPage() {
  const logger = await createRequestLogger({ action: "Donation" });
  const [t, locale] = await Promise.all([getTranslations("Donation"), getLocale()]);

  // The measured card degrades alone. A failed count removes one card rather
  // than printing "0 members" — the Phase 19 failure mode, and on a donation
  // page the one number a reader might actually act on.
  let stats: PublicStats | null = null;
  try {
    stats = await getPublicStats();
  } catch (error) {
    logger.error("Donation public stats fetch failed", { error });
  }

  const formatCount = makeGroupedFormatter(locale);

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <PageHeader title={t("title")} />

      <div className="relative overflow-hidden pb-16">
        {/* Animated gradient background */}
        <div className="absolute top-0 inset-x-0 bottom-0 bg-gradient-to-br from-pink-50 via-background to-purple-50 dark:from-pink-950/20 dark:via-background dark:to-purple-950/20 -z-10" />

        {/* Floating decorative orbs */}
        <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,107,157,0.15),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(255,107,157,0.08),transparent_70%)] rounded-full blur-[80px] pointer-events-none -z-10" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(102,126,234,0.12),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(102,126,234,0.06),transparent_70%)] rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute top-[30%] left-[50%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(240,147,251,0.1),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(240,147,251,0.05),transparent_70%)] rounded-full blur-[90px] pointer-events-none -z-10" />

        <div className="container mx-auto max-w-7xl px-4 relative z-10">
          {/* Hero Section */}
          <div className="flex flex-col gap-12 text-center mb-24 pt-12">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 rounded-full bg-pink-400" />
                <div className="px-5 py-2 rounded-full bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 text-xs uppercase tracking-wider font-bold shadow-[0_2px_8px_rgba(255,45,85,0.2)]">
                  {t("hero_badge")}
                </div>
                <div className="w-3 h-3 rounded-full bg-pink-400" />
              </div>
              <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-[#FF2D55] via-[#FF6B9D] via-[#f093fb] to-[#667eea] bg-clip-text text-transparent leading-tight tracking-tighter max-w-4xl mx-auto">
                {t("hero_title")}
              </h1>
              <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
                {t("hero_subtitle")}
              </p>
            </div>

            {/* Premium Ko-fi CTA with glassmorphism */}
            <div className="w-full max-w-5xl mx-auto relative">
              {/* Multi-layer glow effect */}
              <div className="absolute -top-[30px] -left-[30px] -right-[30px] -bottom-[30px] bg-gradient-to-br from-[rgba(255,45,85,0.3)] to-[rgba(240,147,251,0.3)] rounded-[4rem] blur-[40px] pointer-events-none opacity-60" />

              <div className="relative p-10 md:p-16 bg-gradient-to-br from-[#FF2D55] via-[#FF6B9D] to-[#f093fb] rounded-[3rem] shadow-[0_30px_60px_rgba(255,45,85,0.3)] overflow-hidden hover:translate-y-[-8px] hover:scale-[1.01] hover:shadow-[0_40px_80px_rgba(255,45,85,0.4)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
                {/* Subtle dot pattern overlay */}
                <div
                  className="absolute top-0 inset-x-0 bottom-0 opacity-[0.08] pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 25% 25%, white 2px, transparent 2px), radial-gradient(circle at 75% 75%, white 2px, transparent 2px)",
                    backgroundSize: "60px 60px",
                  }}
                />

                <div className="flex flex-col gap-8 relative z-10">
                  <div className="bg-white/20 p-6 rounded-full backdrop-blur-[10px] border-2 border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)] w-fit mx-auto">
                    <Heart className="w-16 h-16 md:w-24 md:h-24 text-white" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <h2 className="text-xl md:text-5xl text-white font-black tracking-tight">{t("cta_title")}</h2>
                    <p className="text-lg md:text-xl max-w-[750px] mx-auto text-white/95 leading-[1.8] font-medium">
                      {t("cta_body")}
                    </p>
                  </div>
                  <DonateButton kofiUrl={KOFI_URL} variant="hero" label={t("kofi_hero")} />

                  {/* Trust indicators */}
                  <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
                    {TRUST_BADGES.map(({ key, Icon }) => (
                      <div key={key} className="flex items-center gap-2 text-white/90">
                        <Icon />
                        <span className="text-sm font-medium">{t(key)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Impact cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            {CARDS.filter((card) => card.value.kind !== "measured" || stats).map(
              ({ id, Icon, accent, value, titleKey, bodyKey }) => (
                <ImpactCard
                  key={id}
                  accent={accent}
                  Icon={Icon}
                  value={
                    value.kind === "measured"
                      ? formatCount(value.from(stats as PublicStats))
                      : value.kind === "word"
                        ? t(value.key)
                        : "100%"
                  }
                  title={t(titleKey)}
                  body={t(bodyKey)}
                />
              ),
            )}
          </div>

          {/* Mission Statement - Premium glassmorphism card */}
          <div className="bg-card/90 dark:bg-card/80 backdrop-blur-[20px] backdrop-saturate-[180%] p-12 md:p-20 rounded-[4rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-border mb-24 relative overflow-hidden">
            {/* Decorative gradient accent */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-[rgba(240,147,251,0.1)] dark:from-[rgba(240,147,251,0.05)] to-transparent rounded-bl-full" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-10 md:gap-14 relative">
              <Image
                src={bracketsUp}
                alt=""
                className="w-0 md:w-24 h-0 md:h-24 opacity-25 dark:opacity-40 dark:invert hidden md:block"
              />
              <div className="flex flex-col gap-8 flex-1 text-center">
                <p className="text-xl md:text-2xl font-medium text-muted-foreground leading-[1.8] tracking-wide">
                  {t("mission_statement")}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Star className="text-pink-400 w-6 h-6" />
                  {/* One key, not two: the name and the role are a single
                      attribution, and ja/ko/ar put them in the other order. */}
                  <h3 className="text-2xl bg-gradient-to-r from-[#FF2D55] to-[#f093fb] bg-clip-text text-transparent font-black">
                    {t("founder_attribution")}
                  </h3>
                  <Star className="text-pink-400 w-6 h-6" />
                </div>
              </div>
              <Image
                src={bracketsDown}
                alt=""
                className="w-0 md:w-24 h-0 md:h-24 opacity-25 dark:opacity-40 dark:invert hidden md:block"
              />
            </div>
          </div>

          {/* Final CTA Section */}
          <div className="flex flex-col gap-10 text-center mb-16 pb-12">
            <div className="flex flex-col gap-5">
              <h2 className="text-4xl md:text-5xl text-foreground font-black tracking-tight">{t("final_cta_title")}</h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium leading-[1.7]">
                {t("final_cta_body")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 pt-8 w-full justify-center">
              <DonateButton kofiUrl={KOFI_URL} variant="cta" label={t("kofi_cta")} />
              <Link href="/about-us">
                <button
                  type="button"
                  className="border-[3px] border-pink-600 dark:border-pink-500 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/50 hover:-translate-y-1 hover:border-pink-700 dark:hover:border-pink-400 hover:shadow-[0_10px_25px_rgba(255,45,85,0.15)] dark:hover:shadow-[0_10px_25px_rgba(255,45,85,0.25)] active:scale-[0.98] transition-all duration-300 px-14 py-9 rounded-full font-black text-xl h-auto"
                >
                  {t("secondary_cta")}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The three cards, one component.
 *
 * The per-accent class tables are keyed by name rather than spread through
 * `cn()` branches so a card cannot pick up a hover glow that does not match its
 * top border.
 */
const ACCENT = {
  pink: {
    shell:
      "border-pink-400 hover:shadow-[0_20px_60px_rgba(255,45,85,0.15)] dark:hover:shadow-[0_20px_60px_rgba(255,45,85,0.25)]",
    wash: "bg-[radial-gradient(circle,rgba(255,45,85,0.08),transparent)] dark:bg-[radial-gradient(circle,rgba(255,45,85,0.15),transparent)]",
    chip: "bg-pink-50 dark:bg-pink-950/50 border-pink-100 dark:border-pink-900",
    glyph: "text-pink-500",
  },
  blue: {
    shell:
      "border-blue-400 hover:shadow-[0_20px_60px_rgba(22,182,223,0.15)] dark:hover:shadow-[0_20px_60px_rgba(22,182,223,0.25)]",
    wash: "bg-[radial-gradient(circle,rgba(22,182,223,0.08),transparent)] dark:bg-[radial-gradient(circle,rgba(22,182,223,0.15),transparent)]",
    chip: "bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900",
    glyph: "text-blue-500",
  },
  green: {
    shell:
      "border-green-400 hover:shadow-[0_20px_60px_rgba(16,185,129,0.15)] dark:hover:shadow-[0_20px_60px_rgba(16,185,129,0.25)]",
    wash: "bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent)] dark:bg-[radial-gradient(circle,rgba(16,185,129,0.15),transparent)]",
    chip: "bg-green-50 dark:bg-green-950/50 border-green-100 dark:border-green-900",
    glyph: "text-green-500",
  },
} as const;

function ImpactCard({
  accent,
  Icon,
  value,
  title,
  body,
}: {
  accent: keyof typeof ACCENT;
  Icon: LucideIcon;
  value: string;
  title: string;
  body: string;
}) {
  const a = ACCENT[accent];

  return (
    <div
      className={`bg-card p-10 rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] border-t-[6px] relative overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-2 ${a.shell}`}
    >
      <div
        className={`absolute -top-[50px] -right-[50px] w-[150px] h-[150px] rounded-full pointer-events-none ${a.wash}`}
      />
      <div className="flex flex-col gap-5 items-start relative">
        <div className={`w-16 h-16 rounded-full border-[3px] flex items-center justify-center ${a.chip}`}>
          <Icon className={`w-8 h-8 ${a.glyph}`} />
        </div>
        <div className="flex flex-col gap-3 items-start">
          <h3 className="text-5xl text-foreground font-black tracking-tight">{value}</h3>
          <h4 className="text-xl text-foreground font-bold">{title}</h4>
          <p className="text-muted-foreground leading-[1.7] text-base">{body}</p>
        </div>
      </div>
    </div>
  );
}
