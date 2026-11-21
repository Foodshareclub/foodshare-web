import { PageHeader } from "@/components/navigation/PageHeader";
import { Button } from "@/components/ui/button";
import { Check, HandHeart, Heart, Leaf, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
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
  value: Value;
  titleKey: string;
  bodyKey: string;
}> = [
  {
    id: "direct",
    Icon: HandHeart,
    value: { kind: "symbol" },
    titleKey: "impact_direct_title",
    bodyKey: "impact_direct_body",
  },
  {
    id: "members",
    Icon: Users,
    value: { kind: "measured", from: (s) => s.members },
    titleKey: "impact_members_title",
    bodyKey: "impact_members_body",
  },
  {
    id: "waste",
    Icon: Leaf,
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
    <div className="min-h-screen bg-background">
      <PageHeader title={t("title")} />

      <div className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
        {/* Hero */}
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-brand">
            {t("hero_badge")}
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {t("hero_title")}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t("hero_subtitle")}
          </p>
        </div>

        {/* Primary CTA panel */}
        <div className="mt-12 rounded-3xl border border-border bg-card p-8 text-center shadow-sm md:p-12">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
            <span className="flex size-16 items-center justify-center rounded-full bg-brand/10">
              <Heart className="size-8 text-brand" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t("cta_title")}
            </h2>
            <p className="leading-relaxed text-muted-foreground">{t("cta_body")}</p>
            <DonateButton kofiUrl={KOFI_URL} variant="hero" label={t("kofi_hero")} />

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-1">
              {TRUST_BADGES.map(({ key, Icon }) => (
                <div key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4 text-brand" />
                  <span>{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Impact cards */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {CARDS.filter((card) => card.value.kind !== "measured" || stats).map(
            ({ id, Icon, value, titleKey, bodyKey }) => (
              <ImpactCard
                key={id}
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

        {/* Mission statement */}
        <div className="mt-8 rounded-3xl border border-border bg-card p-8 md:p-12">
          <p className="mx-auto max-w-3xl text-center text-xl leading-relaxed text-muted-foreground">
            {t("mission_statement")}
          </p>
          <p className="mt-6 text-center text-lg font-bold text-brand">
            {t("founder_attribution")}
          </p>
        </div>

        {/* Final CTA */}
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t("final_cta_title")}
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t("final_cta_body")}
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <DonateButton kofiUrl={KOFI_URL} variant="cta" label={t("kofi_cta")} />
            <Button variant="brand-outline" size="xl" asChild>
              <Link href="/about-us">{t("secondary_cta")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The three cards, one component.
 *
 * A single warm brand accent across all three keeps the row reading as one
 * system rather than three unrelated colour swatches — the "pink / blue /
 * green" split made it look like a different product. The icon chip, value and
 * body all use the semantic tokens so dark mode resolves from the theme.
 */
function ImpactCard({
  Icon,
  value,
  title,
  body,
}: {
  Icon: LucideIcon;
  value: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand/10">
        <Icon className="size-6 text-brand" />
      </span>
      <h3 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{value}</h3>
      <h4 className="mt-1 text-base font-semibold text-foreground">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
