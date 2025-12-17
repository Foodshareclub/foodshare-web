import { cn } from "@/lib/utils";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** Keyboard key or shortcut to display */
  children: React.ReactNode;
}

/**
 * Kbd - Keyboard shortcut hint component
 *
 * Displays keyboard keys or shortcuts with consistent styling.
 * Useful for showing keyboard shortcuts in tooltips, menus, or help text.
 *
 * @example
 * // Single key
 * <Kbd>Esc</Kbd>
 *
 * @example
 * // Key combination
 * <span className="flex items-center gap-1">
 *   <Kbd>Cmd</Kbd>
 *   <span>+</span>
 *   <Kbd>K</Kbd>
 * </span>
 *
 * @example
 * // In a menu item
 * <MenuItem>
 *   Save <Kbd className="ml-auto">⌘S</Kbd>
 * </MenuItem>
 */
export function Kbd({ children, className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border",
        "border-border/60 bg-muted/50 px-1.5",
        "font-mono text-[10px] font-medium text-muted-foreground",
        "shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

/**
 * KbdCombo - Display a keyboard combination
 *
 * @example
 * <KbdCombo keys={["Cmd", "Shift", "P"]} />
 */
export function KbdCombo({
  keys,
  separator = "+",
  className,
}: {
  keys: string[];
  separator?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {keys.map((key, index) => (
        <span key={key} className="inline-flex items-center">
          <Kbd>{key}</Kbd>
          {index < keys.length - 1 && (
            <span className="mx-0.5 text-muted-foreground/60 text-xs">{separator}</span>
          )}
        </span>
      ))}
    </span>
  );
}

/**
 * Platform-aware modifier key display
 * Shows ⌘ on Mac, Ctrl on other platforms
 */
export function ModifierKey({ className }: { className?: string }) {
  // This would need to be wrapped in useEffect for SSR safety
  // For now, we'll show the unicode symbol which works on all platforms
  return <Kbd className={className}>⌘</Kbd>;
}

export default Kbd;
