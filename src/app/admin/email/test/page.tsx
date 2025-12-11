import { getTranslations } from "next-intl/server";

/**
 * AdminEmailTest - Email provider testing page
 * TODO: Implement email provider testing features
 */
export default async function AdminEmailTest() {
  const t = await getTranslations();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{t("templates")}</h1>
      <p className="text-muted-foreground mt-2">{t("setup_guides_and_references")}</p>
    </div>
  );
}
