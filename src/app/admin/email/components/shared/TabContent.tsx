/**
 * TabContent - CSS-animated wrapper for tab panels
 * Replaces framer-motion with native CSS animations for smaller bundle
 */
export function TabContent({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">{children}</div>;
}
