import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type React from "react";

/**
 * SearchField - A search input molecule
 * Provides standardized search field with proper labeling and styling
 */
interface SearchFieldProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  placeholder = "Search...",
  value,
  onChange,
  onSubmit,
  disabled,
  className,
  label,
}) => {
  const t = useTranslations();
  return (
    <div className={cn("relative w-full", className)}>
      {label && (
        <label
          htmlFor="search-field"
          className="absolute start-0 top-1/2 -translate-y-1/2 ps-2 text-muted-foreground text-xs"
        >
          {label}
        </label>
      )}
      <input
        id="search-field"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full ps-10 pe-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
      {onSubmit && (
        <button
          type="submit"
          className="absolute end-0 top-1/2 -translate-y-1/2 pe-2"
          onClick={() => onSubmit(value || "")}
          aria-label={t("msgsearch")}
        >
          ⏱️
        </button>
      )}
    </div>
  );
};
