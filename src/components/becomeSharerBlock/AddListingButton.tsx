import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface AddListingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

/**
 * AddListingButton Component
 * Shared green button used for "Add listing" in navbar
 * Used by both authenticated (BecomeSharerBlock) and unauthenticated (BecomeSharerButton) states
 */
export const AddListingButton = forwardRef<HTMLButtonElement, AddListingButtonProps>(
  ({ className, children = "Add listing", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-medium shadow-md",
          "hover:bg-emerald-600 hover:shadow-lg hover:scale-[1.02]",
          "active:scale-[0.98] transition-all duration-200 whitespace-nowrap",
          className
        )}
        {...props}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {children}
      </button>
    );
  }
);

AddListingButton.displayName = "AddListingButton";
