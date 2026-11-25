"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { POST_TYPE_OPTIONS } from "./types";

interface ListingTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const SELECT_COPY = {
  placeholder: "Select category",
} as const;

export function ListingTypeSelect({ value, onChange }: ListingTypeSelectProps) {
  const t = useTranslations();

  return (
    <div>
      <Label htmlFor="post_type" className="text-base font-semibold mb-2 block text-foreground">
        {t("category")} <span className="text-destructive">{"*"}</span>
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id="post_type"
          className="w-full h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:ring-2 focus:ring-primary/20 text-sm"
        >
          <SelectValue placeholder={SELECT_COPY.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {POST_TYPE_OPTIONS.map(({ value: optionValue, label, Icon, iconClass }) => (
            <SelectItem key={optionValue} value={optionValue}>
              <span className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${iconClass}`} aria-hidden="true" />
                <span>{label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
