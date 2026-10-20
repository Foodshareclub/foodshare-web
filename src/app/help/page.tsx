import { PageHeader } from "@/components/navigation/PageHeader";
import { generateFAQJsonLd, safeJsonLdStringify } from "@/lib/jsonld";
import { generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

// The title and description have to resolve per request: a German visitor
// should not be handed an English <title> for a page whose body is in German.
// Keywords stay English — they are an indexing hint, not visible copy, and the
// terms people actually search in are English here.
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("Help"), getLocale()]);

  return generatePageMetadata({
    title: t("title"),
    description: t("metaDescription"),
    keywords: ["help", "support", "FAQ", "guide", "how to"],
    path: "/help",
    locale,
  });
}

export default async function HelpPage() {
  const t = await getTranslations("Help");

  const faqs = [
    { question: t("qCreateAccount"), answer: t("aCreateAccount") },
    { question: t("qShareFood"), answer: t("aShareFood") },
    { question: t("qFindFood"), answer: t("aFindFood") },
    { question: t("qWhatFood"), answer: t("aWhatFood") },
    { question: t("qMessage"), answer: t("aMessage") },
    { question: t("qFree"), answer: t("aFree") },
  ];

  const faqJsonLd = generateFAQJsonLd(faqs);

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD needs a raw script tag; safeJsonLdStringify escapes angle brackets and ampersands so a script-tag breakout is impossible
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-muted/30 dark:bg-background">
        <PageHeader title={t("title")} />

        <div className="container mx-auto max-w-4xl py-8 px-4">
          <div className="bg-card rounded-2xl shadow-sm p-8 md:p-12">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">{t("gettingStarted")}</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("qCreateAccount")}</h3>
                    <p className="text-foreground/80 text-sm">{t("aCreateAccount")}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("qShareFood")}</h3>
                    <p className="text-foreground/80 text-sm">{t("aShareFood")}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("qFindFood")}</h3>
                    <p className="text-foreground/80 text-sm">{t("aFindFood")}</p>
                  </div>
                </div>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">{t("foodSafety")}</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("qWhatFood")}</h3>
                    <p className="text-foreground/80 text-sm">{t("aWhatFood")}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("safetyTips")}</h3>
                    <ul className="text-foreground/80 text-sm list-disc list-inside space-y-1">
                      <li>{t("tipExpiry")}</li>
                      <li>{t("tipTemperature")}</li>
                      <li>{t("tipAllergens")}</li>
                      <li>{t("tipContainers")}</li>
                      <li>{t("tipDoubt")}</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      {t("deepDive")}{" "}
                      <Link href="/guides/food-safety" className="underline font-medium">
                        {t("guideFoodSafety")}
                      </Link>{" "}
                      ·{" "}
                      <Link href="/guides/expiry-dates" className="underline font-medium">
                        {t("guideExpiryDates")}
                      </Link>{" "}
                      ·{" "}
                      <Link href="/guides/what-can-i-share" className="underline font-medium">
                        {t("guideWhatCanShare")}
                      </Link>
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">{t("usingTheApp")}</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("qMessage")}</h3>
                    <p className="text-foreground/80 text-sm">{t("aMessage")}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("qEditListing")}</h3>
                    <p className="text-foreground/80 text-sm">{t("aEditListing")}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("qCommunityFridges")}</h3>
                    <p className="text-foreground/80 text-sm">{t("aCommunityFridges")}</p>
                  </div>
                </div>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">{t("accountPrivacy")}</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("qSettings")}</h3>
                    <p className="text-foreground/80 text-sm">{t("aSettings")}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("qLocation")}</h3>
                    <p className="text-foreground/80 text-sm">{t("aLocation")}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t("qDeleteAccount")}</h3>
                    <p className="text-foreground/80 text-sm">{t("aDeleteAccount")}</p>
                  </div>
                </div>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">{t("guides")}</h2>
                <p className="text-foreground/80 mb-4 text-sm">{t("legacyNote")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/guides/sharing-guidelines"
                    className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition text-sm font-medium"
                  >
                    {t("guideSharingGuidelines")}
                  </Link>
                  <Link
                    href="/guides/safe-sharing"
                    className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition text-sm font-medium"
                  >
                    {t("guideSafeSharing")}
                  </Link>
                  <Link
                    href="/guides/borrow"
                    className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition text-sm font-medium"
                  >
                    {t("guideBorrow")}
                  </Link>
                  <Link
                    href="/guides/cookie-policy"
                    className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition text-sm font-medium"
                  >
                    {t("guideCookiePolicy")}
                  </Link>
                  <Link
                    href="/guides"
                    className="p-3 bg-[#FF2D55]/10 rounded-lg hover:bg-[#FF2D55]/20 transition text-sm font-medium text-[#FF2D55]"
                  >
                    {t("viewAllGuides")}
                  </Link>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">{t("needMoreHelp")}</h2>
                <p className="text-foreground/80 mb-4">
                  {t.rich("cantFind", {
                    accountSettings: (chunks) => (
                      <Link href="/settings" className="text-[#FF2D55] hover:underline">
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
                <p className="text-foreground/80">
                  {t.rich("alsoReview", {
                    terms: (chunks) => (
                      <Link href="/terms" className="text-[#FF2D55] hover:underline">
                        {chunks}
                      </Link>
                    ),
                    privacy: (chunks) => (
                      <Link href="/privacy" className="text-[#FF2D55] hover:underline">
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
