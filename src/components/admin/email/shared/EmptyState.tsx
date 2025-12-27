export function EmptyState({
  icon,
  message,
  action,
}: {
  icon: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-3 text-muted-foreground">{icon}</div>
      <p className="text-muted-foreground">{message}</p>
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
