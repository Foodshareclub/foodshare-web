export function EmptyState({
  icon,
  message,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  /** Simple message (use this OR title/description) */
  message?: string;
  /** Title text (alternative to message) */
  title?: string;
  /** Description text (used with title) */
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-3 text-muted-foreground">{icon}</div>
      {message && <p className="text-muted-foreground">{message}</p>}
      {title && <p className="font-medium text-foreground">{title}</p>}
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      {action}
    </div>
  );
}

export function QuickTemplateButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-sm"
    >
      {label}
    </button>
  );
}
