import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { ComponentProps } from "react";

/** Shared, accessible action for authenticated and guest listing flows. */
export function AddListingButton({ className, children = "Add listing", ...props }: ComponentProps<"button">) {
  return (
    <Button
      type="button"
      className={cn(
        "h-10 rounded-full bg-brand hover:bg-brand-hover px-4 text-sm font-semibold text-white shadow-xs hover:shadow-sm transition-all duration-200 motion-reduce:transition-none cursor-pointer flex items-center gap-1.5",
        className,
      )}
      {...props}
    >
      <Plus className="size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </Button>
  );
}
