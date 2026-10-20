import { PageHeader } from "@/components/navigation/PageHeader";
import { generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

// A German reader should not be handed an English <title> for a page whose
// body is in German, and the <title> is the part search engines read.
// Keywords stay English — they are an indexing hint, not visible copy.
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("Privacy"), getLocale()]);

  return generatePageMetadata({
    title: t("meta_title"),
    description: t("meta_description"),
    keywords: ["privacy policy", "privacy", "data protection", "GDPR"],
    path: "/privacy",
    locale,
  });
}

/**
 * A numbered section heading.
 *
 * The number is rendered beside the message rather than inside it. That is the
 * whole reason the messages carry `Information We Collect` and not
 * `1. Information We Collect`: the number is a reading aid over the document
 * structure, not copy, and several locales reorder or renumber sections. Putting
 * it in the string would pin the numbering to English — and once a translator
 * drops the number because their language does not do that, the section
 * headings silently lose their cross-references.
 */
function SectionHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-foreground mb-4">
      <span className="text-muted-foreground">{n}.</span> {children}
    </h2>
  );
}

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <PageHeader title={t("title")} />

      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="bg-card rounded-2xl shadow-sm p-8 md:p-12">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-muted-foreground mb-6">{t("lastUpdated")}</p>

            <section className="mb-8">
              <SectionHeading n={1}>{t("s1_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s1_intro")}</p>
              <ul className="list-disc list-inside text-foreground/80 space-y-2 ms-4">
                <li>{t("s1_account")}</li>
                <li>{t("s1_profile")}</li>
                <li>{t("s1_listings")}</li>
                <li>{t("s1_messages")}</li>
                <li>{t("s1_feedback")}</li>
              </ul>
            </section>

            <section className="mb-8">
              <SectionHeading n={2}>{t("s2_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s2_intro")}</p>
              <ul className="list-disc list-inside text-foreground/80 space-y-2 ms-4">
                <li>{t("s2_service")}</li>
                <li>{t("s2_connect")}</li>
                <li>{t("s2_notify")}</li>
                <li>{t("s2_respond")}</li>
                <li>{t("s2_abuse")}</li>
              </ul>
            </section>

            <section className="mb-8">
              <SectionHeading n={3}>{t("s3_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s3_intro")}</p>
              <ul className="list-disc list-inside text-foreground/80 space-y-2 ms-4">
                <li>{t("s3_users")}</li>
                <li>{t("s3_providers")}</li>
                <li>{t("s3_legal")}</li>
                <li>{t("s3_consent")}</li>
              </ul>
            </section>

            <section className="mb-8">
              <SectionHeading n={4}>{t("s4_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s4_body")}</p>
            </section>

            <section className="mb-8">
              <SectionHeading n={5}>{t("s5_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s5_body")}</p>
            </section>

            <section className="mb-8">
              <SectionHeading n={6}>{t("s6_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s6_intro")}</p>
              <ul className="list-disc list-inside text-foreground/80 space-y-2 ms-4">
                <li>{t("s6_access")}</li>
                <li>{t("s6_delete")}</li>
                <li>{t("s6_marketing")}</li>
                <li>{t("s6_copy")}</li>
              </ul>
            </section>

            <section className="mb-8">
              <SectionHeading n={7}>{t("s7_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s7_body")}</p>
            </section>

            <section className="mb-8">
              <SectionHeading n={8}>{t("s8_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s8_body")}</p>
            </section>

            <section className="mb-8">
              <SectionHeading n={9}>{t("s9_title")}</SectionHeading>
              <p className="text-foreground/80 mb-4">{t("s9_body")}</p>
            </section>

            <section>
              <SectionHeading n={10}>{t("s10_title")}</SectionHeading>
              <p className="text-foreground/80">{t("s10_body")}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
