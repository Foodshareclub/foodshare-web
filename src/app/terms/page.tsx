import { PageHeader } from "@/components/navigation/PageHeader";
import { generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("Terms"), getLocale()]);

  return generatePageMetadata({
    title: t("meta_title"),
    description: t("meta_description"),
    keywords: ["terms of service", "terms", "conditions", "legal"],
    path: "/terms",
    locale,
  });
}

/** @see src/app/privacy/page.tsx — the number is a reading aid, not copy. */
function SectionHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-foreground mb-4">
      <span className="text-muted-foreground">{n}.</span> {children}
    </h2>
  );
}

export default async function TermsPage() {
  const t = await getTranslations("Terms");

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <PageHeader title={t("title")} />

      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="bg-card rounded-2xl shadow-sm p-8 md:p-12">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-muted-foreground mb-6">{t("lastUpdated")}</p>

            <section className="mb-8">
              <SectionHeading n={1}>{t("s1_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s1_body")}</p>
            </section>

            <section className="mb-8">
              <SectionHeading n={2}>{t("s2_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s2_body")}</p>
            </section>

            <section className="mb-8">
              <SectionHeading n={3}>{t("s3_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s3_intro")}</p>
              <ul className="list-disc list-inside text-foreground/80 space-y-2 ms-4">
                <li>{t("s3_accurate")}</li>
                <li>{t("s3_safe")}</li>
                <li>{t("s3_respect")}</li>
                <li>{t("s3_purpose")}</li>
                <li>{t("s3_lawful")}</li>
              </ul>
            </section>

            <section className="mb-8">
              <SectionHeading n={4}>{t("s4_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s4_body")}</p>
            </section>

            <section className="mb-8">
              <SectionHeading n={5}>{t("s5_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">
                {/* The link is inside a sentence, and `TranslationValues` is
                    `string | number | Date` — so it cannot be an interpolated
                    string. The tag lives in the ICU message, which also means
                    the link's own text follows the word order of the language
                    instead of being pinned to English between two English
                    fragments. */}
                {t.rich("privacy_link", {
                  privacy: (chunks) => (
                    <Link href="/privacy" className="text-[#FF2D55] hover:underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </section>

            <section className="mb-8">
              <SectionHeading n={6}>{t("s6_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s6_body")}</p>
            </section>

            <section className="mb-8">
              <SectionHeading n={7}>{t("s7_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s7_body")}</p>
            </section>

            <section>
              <SectionHeading n={8}>{t("s8_title")}</SectionHeading>
              <p className="text-foreground/80">{t("s8_body")}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
