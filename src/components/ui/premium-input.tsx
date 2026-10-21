import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface PremiumInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const PremiumInput = forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ className, label, error, icon, iconPosition = "left", id, ...props }, ref) => {
    const inputId = id || props.name || label;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === "left" && (
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground",
              "placeholder:text-muted-foreground/60",
              "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              "hover:border-foreground/20",
              "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              icon && iconPosition === "left" && "ps-10",
              icon && iconPosition === "right" && "pe-10",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              className,
            )}
            {...props}
          />
          {icon && iconPosition === "right" && (
            <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);

PremiumInput.displayName = "PremiumInput";
