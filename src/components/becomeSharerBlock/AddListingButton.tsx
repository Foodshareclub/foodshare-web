import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { ComponentProps } from "react";

/** Shared, accessible action for authenticated and guest listing flows. */
export function AddListingButton({
  className,
  children = "Add listing",
  ...props
}: ComponentProps<"button">) {
  return (
    <Button
      type="button"
      className={cn(
        "min-h-12 rounded-full bg-emerald-700 px-4 text-white shadow-sm hover:bg-emerald-800 motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      <Plus className="size-4" aria-hidden="true" />
      {children}
    </Button>
  );
}
