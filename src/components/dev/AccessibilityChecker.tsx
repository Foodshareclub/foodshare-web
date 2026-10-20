"use client";

import { useEffect, useState } from "react";

/**
 * Structural subset of an axe-core violation used by this dev-only overlay.
 */
type AxeViolation = {
  description: string;
  help: string;
  impact?: string | null;
  nodes: { html: string; failureSummary?: string }[];
};

/**
 * Accessibility Checker - Development Only
 * Uses axe-core to run accessibility audits and display violations
 */
export function AccessibilityChecker() {
  const [violations, setViolations] = useState<AxeViolation[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== "development") return;

    const runAxe = async () => {
      try {
        const axe = await import("axe-core");
        const results = await axe.default.run();

        if (results.violations.length > 0) {
          setViolations(results.violations);
          console.group("🔍 Accessibility Issues Found");
          results.violations.forEach((violation) => {
            console.warn(`[${violation.impact}] ${violation.description}`);
            violation.nodes.forEach((node) => {
              console.log("  Element:", node.html);
              console.log("  Fix:", node.failureSummary);
            });
          });
          console.groupEnd();
        }
      } catch {
        // axe-core not installed - that's fine, it's optional
        console.debug("axe-core not available for accessibility testing");
      }
    };

    // Run after page loads
    const timer = setTimeout(runAxe, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Don't render anything in production
  if (process.env.NODE_ENV !== "development") return null;
  if (violations.length === 0) return null;

  return (
    <div className="fixed bottom-20 end-4 z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-yellow-500 text-white px-3 py-2 rounded-full shadow-lg hover:bg-yellow-600 text-sm font-bold"
      >
        ⚠️ A11y ({violations.length})
      </button>

      {isOpen && (
        <div className="absolute bottom-12 end-0 w-96 max-h-80 overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-4">
          <h3 className="font-bold text-red-600 mb-2">Accessibility Issues</h3>
          {violations.map((v) => (
            <div key={v.help} className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
              <div className="font-semibold text-red-700 dark:text-red-400">
                [{v.impact}] {v.help}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{v.nodes.length} element(s) affected</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
