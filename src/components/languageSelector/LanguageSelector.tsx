'use client';

import React from "react";
import { useLocale } from "next-intl";
import { useChangeLocale } from "@/app/providers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportedLocales, localeMetadata } from "@/utils/i18n";

/**
 * LanguageSelector Component
 * Allows users to change the application language
 * Uses next-intl for locale management (replaces Redux)
 */
const LanguageSelector = () => {
  // Get current locale from next-intl
  const locale = useLocale();
  const { changeLocale } = useChangeLocale();

  const handleChange = (value: string) => {
    changeLocale(value as 'en' | 'cs' | 'de' | 'es' | 'fr' | 'pt' | 'ru' | 'uk' | 'zh' | 'hi' | 'ar' | 'it' | 'pl' | 'nl' | 'ja' | 'ko' | 'tr');
  };

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger variant="glass" className="w-[140px] h-8">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent variant="glass">
        {supportedLocales.map((locale) => {
          const { flag, nativeName } = localeMetadata[locale];
          return (
            <SelectItem key={locale} value={locale}>
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
