"use client";

import { useChangeLocale } from "@/app/providers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Locale, localeMetadata, locales } from "@/i18n/config";
import { useLocale } from "next-intl";
import React from "react";

/**
 * LanguageSelector Component
 * Allows users to change the application language
 * Uses next-intl for locale management (replaces Redux)
 */
const LanguageSelector = () => {
  // Get current locale from next-intl
  const locale = useLocale();
  const { changeLocale, locale: contextLocale } = useChangeLocale();

  const handleChange = async (value: string) => {
    if (value && value !== locale) {
      await changeLocale(value as Locale);
    }
  };

  // Use context locale for consistency (it updates immediately on change)
  const currentLocale = contextLocale || locale;

  return (
    <Select value={currentLocale} onValueChange={handleChange}>
      <SelectTrigger variant="glass" className="w-[140px] h-8">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent variant="glass">
        {locales.map((loc) => {
          const { flag, nativeName } = localeMetadata[loc];
          return (
            <SelectItem key={loc} value={loc}>
              <span className="flex items-center gap-2">
                <span>{flag}</span>
                <span>{nativeName}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;
