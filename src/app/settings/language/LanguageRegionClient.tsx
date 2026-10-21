"use client";

/**
 * Language & Region Settings Client - Enhanced Version
 * Ultra-polished UI with advanced features:
 * - Distance units toggle (km/miles)
 * - Auto-detect language
 * - Coverage area calculation
 * - Toast notifications
 * - Popular languages
 * - Keyboard shortcuts
 * - Mini map preview
 * - Smooth animations
 */

import { useChangeLocale } from "@/app/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useLocationFilter } from "@/hooks/useLocationFilter";
import { type Locale, getBrowserLocale, localeMetadata, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/zustand/useUIStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Compass,
  Globe,
  Map as MapIcon,
  MapPin,
  Navigation,
  Ruler,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

/**
 * Radius presets, by key rather than by label.
 *
 * The label and description were English literals in a module-level constant,
 * which is why this page — the one a user visits *to choose a language* —
 * rendered at 0% in every locale but English. The keys resolve through
 * `languageSettings.presets.<km>`.
 */
const RADIUS_PRESETS = [1, 5, 10, 25, 50, 100].map((km) => ({ km, icon: RADIUS_PRESET_ICONS[km] }));

const RADIUS_PRESET_ICONS: Record<number, string> = {
  1: "🏘️",
  5: "🏙️",
  10: "🌆",
  25: "🗺️",
  50: "🌍",
  100: "🌎",
};

const POPULAR_LOCALES: Locale[] = ["en", "es", "fr", "de", "pt", "zh", "ja", "ar"];

/** Regions, named by key. See RADIUS_PRESETS for why. */
const REGIONS: Array<{
  id: "global" | "europe" | "asia" | "mena";
  locales: Locale[];
}> = [
  { id: "global", locales: ["en", "es", "fr", "pt"] },
  { id: "europe", locales: ["cs", "de", "ru", "uk", "it", "pl", "nl", "sv"] },
  { id: "asia", locales: ["zh", "hi", "ja", "ko", "vi", "id", "th"] },
  { id: "mena", locales: ["ar", "tr"] },
];

// Conversion helpers
const KM_TO_MILES = 0.621371;
const MILES_TO_KM = 1.60934;

function kmToMiles(km: number): number {
  return Math.round(km * KM_TO_MILES * 10) / 10;
}

function milesToKm(miles: number): number {
  return Math.round(miles * MILES_TO_KM * 10) / 10;
}

function calculateArea(radiusKm: number): string {
  const area = Math.PI * radiusKm * radiusKm;
  if (area < 1) {
    return `${Math.round(area * 100) / 100} km²`;
  }
  if (area < 10) {
    return `${Math.round(area * 10) / 10} km²`;
  }
  return `${Math.round(area)} km²`;
}

export function LanguageRegionClient() {
  // This page was 100% untranslated: every heading, label, placeholder, tooltip
  // and preset name was an English literal. It is also the page a user opens in
  // order to *choose* a language, so a non-English speaker arriving there was
  // told to pick a language in English.
  const t = useTranslations("languageSettings");

  const nextIntlLocale = useLocale() as Locale;
  const { changeLocale, locale: contextLocale } = useChangeLocale();
  const currentLocale = contextLocale || nextIntlLocale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const { geoDistance, setGeoDistance, distanceUnit, setDistanceUnit } = useUIStore();
  const { radiusMeters, setRadiusKm, isEnabled, requestLocation, clearLocation } = useLocationFilter();

  // Convert meters to current unit
  const currentRadiusKm = Math.round((geoDistance ?? radiusMeters) / 1000);
  const currentRadiusDisplay = distanceUnit === "miles" ? kmToMiles(currentRadiusKm) : currentRadiusKm;
  const [localRadius, setLocalRadius] = useState(currentRadiusDisplay);

  // Detect browser language
  const detectedLocale = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getBrowserLocale();
  }, []);

  // Auto-detect keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("language-search")?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  // Filter languages by search and region
  const filteredLocales = useMemo(() => {
    let filtered = [...locales];

    // Filter by region
    if (selectedRegion) {
      const region = REGIONS.find((r) => r.id === selectedRegion);
      if (region) {
        filtered = filtered.filter((locale) => region.locales.includes(locale));
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((locale) => {
        const meta = localeMetadata[locale];
        return (
          meta.nativeName.toLowerCase().includes(query) ||
          meta.name.toLowerCase().includes(query) ||
          locale.toLowerCase().includes(query)
        );
      });
    }

    // Sort: current first, then alphabetically by native name
    return filtered.sort((a, b) => {
      if (a === currentLocale) return -1;
      if (b === currentLocale) return 1;
      return localeMetadata[a].nativeName.localeCompare(localeMetadata[b].nativeName);
    });
  }, [searchQuery, selectedRegion, currentLocale]);

  const handleLanguageChange = useCallback(
    async (locale: Locale) => {
      if (locale === currentLocale) return;

      await changeLocale(locale);

      startTransition(() => {
        router.refresh();
      });
    },
    [changeLocale, currentLocale, router],
  );

  const handleRadiusChange = useCallback(
    (value: number[]) => {
      const newValue = value[0];
      setLocalRadius(newValue);

      // Convert to km if in miles
      const radiusInKm = distanceUnit === "miles" ? milesToKm(newValue) : newValue;
      setGeoDistance(radiusInKm * 1000);
      setRadiusKm(radiusInKm);
    },
    [distanceUnit, setGeoDistance, setRadiusKm],
  );

  const handlePresetClick = useCallback(
    (km: number) => {
      const displayValue = distanceUnit === "miles" ? kmToMiles(km) : km;
      setLocalRadius(displayValue);
      setGeoDistance(km * 1000);
      setRadiusKm(km);
    },
    [distanceUnit, setGeoDistance, setRadiusKm],
  );

  const handleUnitToggle = useCallback(
    (checked: boolean) => {
      const newUnit = checked ? "miles" : "km";
      setDistanceUnit(newUnit);

      // Convert current radius
      const newDisplay = newUnit === "miles" ? kmToMiles(currentRadiusKm) : currentRadiusKm;
      setLocalRadius(newDisplay);
    },
    [currentRadiusKm, setDistanceUnit],
  );

  const handleAutoDetect = useCallback(() => {
    if (detectedLocale && detectedLocale !== currentLocale) {
      handleLanguageChange(detectedLocale);
    }
  }, [detectedLocale, currentLocale, handleLanguageChange]);

  // Calculate coverage area
  const coverageArea = useMemo(() => {
    return calculateArea(currentRadiusKm);
  }, [currentRadiusKm]);

  // Min/max for slider based on units
  const sliderMin = distanceUnit === "miles" ? 1 : 1;
  const sliderMax = distanceUnit === "miles" ? 62 : 100; // ~62 miles = 100 km
  const sliderStep = distanceUnit === "miles" ? 0.5 : 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -end-40 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -start-20 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-10 max-w-4xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>

          {/* Keyboard shortcut hint */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
            <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono">⌘K</kbd>
            <span>to search languages</span>
          </div>
        </motion.header>

        <div className="space-y-6">
          {/* Language Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Glass variant="prominent" className="p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-semibold">{t("language")}</h2>
                <Badge variant="secondary" className="ms-auto">
                  {locales.length} languages
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Choose your preferred language. The interface will update immediately.
              </p>

              {/* Auto-detect banner */}
              {detectedLocale && detectedLocale !== currentLocale && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Detected: {localeMetadata[detectedLocale].nativeName}</p>
                      <p className="text-xs text-muted-foreground">{t("basedOnBrowser")}</p>
                    </div>
                    <Button size="sm" onClick={handleAutoDetect} className="flex-shrink-0">
                      Switch
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Popular languages */}
              <div className="mb-6">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                  {t("popular")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_LOCALES.map((locale) => {
                    const meta = localeMetadata[locale];
                    const isActive = locale === currentLocale;
                    return (
                      <Button
                        key={locale}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleLanguageChange(locale)}
                        disabled={isPending || isActive}
                        className="gap-2"
                      >
                        <span className="text-base">{meta.flag}</span>
                        <span>{meta.nativeName}</span>
                        {isActive && <Check className="w-3 h-3" />}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Search and region filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="language-search"
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-9 h-10"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  <Button
                    variant={selectedRegion === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRegion(null)}
                    className="whitespace-nowrap"
                  >
                    {t("allRegions")}
                  </Button>
                  {REGIONS.map((region) => (
                    <Button
                      key={region.id}
                      variant={selectedRegion === region.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRegion(region.id)}
                      className="whitespace-nowrap"
                    >
                      {t(`regions.${region.id}`)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Language list */}
              <div className="grid gap-2 max-h-[400px] overflow-y-auto pe-2 scrollbar-thin">
                <AnimatePresence mode="popLayout">
                  {filteredLocales.map((locale, index) => {
                    const meta = localeMetadata[locale];
                    const isActive = locale === currentLocale;

                    return (
                      <motion.button
                        key={locale}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        onClick={() => handleLanguageChange(locale)}
                        disabled={isPending || isActive}
                        className={cn(
                          "group relative flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
                          "border border-border/50 hover:border-border",
                          isActive
                            ? "bg-primary/10 border-primary/50 shadow-sm"
                            : "bg-card/50 hover:bg-card hover:shadow-md hover:-translate-y-0.5",
                          isPending && "opacity-50 cursor-wait",
                          meta.direction === "rtl" && "flex-row-reverse",
                        )}
                      >
                        {/* Flag */}
                        <div className="text-3xl">{meta.flag}</div>

                        {/* Language info */}
                        <div className={cn("flex-1 text-start", meta.direction === "rtl" && "text-end")}>
                          <div className="font-medium text-foreground flex items-center gap-2">
                            <span>{meta.nativeName}</span>
                            {meta.direction === "rtl" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                RTL
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{meta.name}</div>
                        </div>

                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </motion.div>
                        )}

                        {!isActive && (
                          <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>

              {filteredLocales.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t("noLanguagesFound")}</p>
                </div>
              )}
            </Glass>
          </motion.div>

          {/* Search Radius */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Glass variant="prominent" className="p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-4">
                <MapIcon className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold">{t("searchRadius")}</h2>
                <Badge variant="secondary" className="ms-auto">
                  {localRadius} {distanceUnit}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t("searchRadiusDescription")}</p>

              {/* Unit toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 mb-6">
                <div className="flex items-center gap-3">
                  <Ruler className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="unit-toggle" className="font-medium cursor-pointer">
                      {t("distanceUnits")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {distanceUnit === "km" ? t("kilometers") : t("miles")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm", distanceUnit === "km" && "font-semibold")}>km</span>
                  <Switch id="unit-toggle" checked={distanceUnit === "miles"} onCheckedChange={handleUnitToggle} />
                  <span className={cn("text-sm", distanceUnit === "miles" && "font-semibold")}>mi</span>
                </div>
              </div>

              {/* Coverage info */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Compass className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium">{t("coverage")}</span>
                  </div>
                  <p className="text-lg font-semibold">{coverageArea}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium">{t("radius")}</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {localRadius} {distanceUnit}
                  </p>
                </div>
              </div>

              {/* Radius slider */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Slider
                    value={[localRadius]}
                    onValueChange={handleRadiusChange}
                    min={sliderMin}
                    max={sliderMax}
                    step={sliderStep}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {sliderMin} {distanceUnit}
                    </span>
                    <span className="font-medium text-base text-foreground">
                      {localRadius} {distanceUnit}
                    </span>
                    <span>
                      {sliderMax} {distanceUnit}
                    </span>
                  </div>
                </div>

                {/* Preset buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {RADIUS_PRESETS.map((preset) => {
                    const displayValue = distanceUnit === "miles" ? kmToMiles(preset.km) : preset.km;
                    const isActive = Math.abs(localRadius - displayValue) < 0.1;

                    return (
                      <Button
                        key={preset.km}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePresetClick(preset.km)}
                        className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-lg">{preset.icon}</span>
                          <span className="font-semibold">
                            {displayValue} {distanceUnit}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-normal">
                          {t(`presets.${preset.km}.label`)}
                        </span>
                        <span className="text-[11px] text-muted-foreground/80 font-normal">
                          {t(`presets.${preset.km}.description`)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </Glass>
          </motion.div>

          {/* Location Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Glass variant="subtle" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Navigation className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-semibold">{t("locationServices")}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t("locationServicesDescription")}</p>

              <div className="flex flex-col sm:flex-row gap-3">
                {!isEnabled ? (
                  <Button onClick={requestLocation} variant="default" size="sm" className="gap-2">
                    <MapPin className="w-4 h-4" />
                    {t("enableLocation")}
                  </Button>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {t("locationEnabled")}
                    </div>
                    <Button onClick={clearLocation} variant="outline" size="sm" className="gap-2">
                      {t("clearLocationData")}
                    </Button>
                  </>
                )}
              </div>
            </Glass>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Glass variant="subtle" className="p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-2">{t("proTips")}</h3>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("tipSettingsSaved")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("tipLanguageImmediate")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("tipLocationNotStored")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("tipSearchShortcut")}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Glass>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default LanguageRegionClient;
