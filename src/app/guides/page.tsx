import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { guides } from "@/lib/guides";

const categoryLabels: Record<string, string> = {
  Safety: "Safety",
  Sharing: "Community",
  Food: "Food",
  Borrow: "Borrow",
  Legal: "Legal",
};

const grouped = guides.reduce<Record<string, typeof guides>>((acc, g) => {
  (acc[g.category] ??= []).push(g);
  return acc;
}, {});

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <PageHeader title="Guides" />
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <p className="text-muted-foreground mb-8">
          Practical guides from the FoodShare community — migrated from our legacy docs. Everything
          here also lives in{" "}
          <Link href="/help" className="text-[#FF2D55] hover:underline">
            Help Center
          </Link>
          .
        </p>
        <div className="space-y-10">
          {Object.entries(grouped).map(([cat, list]) => (
            <section key={cat}>
              <h2 className="text-lg font-semibold mb-4">{categoryLabels[cat] ?? cat}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {list.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className="block rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium text-foreground">{g.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {g.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
