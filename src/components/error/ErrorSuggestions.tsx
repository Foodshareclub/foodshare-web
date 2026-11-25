import Link from "next/link";
import { ERROR_COPY } from "./error-variants";

/**
 * Pre-built troubleshooting suggestions component for admin errors.
 */
export function AdminTroubleshootingSteps() {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">{ERROR_COPY.adminTroubleshootingTitle}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {ERROR_COPY.adminSteps.map((step) => (
          <li key={step} className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5" aria-hidden="true">
              •
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Pre-built suggestions component for product/food errors.
 */
export function ProductErrorSuggestions() {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">{ERROR_COPY.productSuggestionsTitle}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {ERROR_COPY.productSuggestions.map((step) => (
          <li key={step} className="flex items-start gap-2">
            <span className="text-orange-500 mt-0.5" aria-hidden="true">
              •
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Admin links footer component.
 */
export function AdminLinksFooter() {
  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex flex-wrap gap-2 justify-center">
        <Link href="/admin/reports" className="text-sm text-muted-foreground hover:text-foreground underline">
          {ERROR_COPY.viewReports}
        </Link>
        <span className="text-muted-foreground/30" aria-hidden="true">
          |
        </span>
        <Link href="/admin/email/monitor" className="text-sm text-muted-foreground hover:text-foreground underline">
          {ERROR_COPY.emailMonitor}
        </Link>
        <span className="text-muted-foreground/30" aria-hidden="true">
          |
        </span>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline">
          {ERROR_COPY.mainSite}
        </Link>
      </div>
    </div>
  );
}

/**
 * Product category links component.
 */
export function ProductCategoryLinks() {
  return (
    <div className="mt-6">
      <div className="glass-subtle rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">{ERROR_COPY.browseByCategory}</h3>
        <div className="flex flex-wrap gap-2">
          {ERROR_COPY.categoryLinks.map((category) => (
            <Link
              key={category}
              href={`/food?type=${category}`}
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-foreground hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-sm transition-all capitalize"
            >
              {category}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
