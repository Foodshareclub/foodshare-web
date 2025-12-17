"use client";

/**
 * Language & Region Settings Client
 * Elegant UI for language selection, search radius, and location preferences
 */

import { useState, useMemo, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Search,
  MapPin,
  Check,
  ChevronRight,
  Navigation,
  Sparkles,
  Map,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Glass } from "@/components/ui/glass";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/zustand/useUIStore";
import { useLocationFilter } from "@/hooks/useLocationFilter";
import { locales, localeMetadata, type Locale } from "@/i18n/config";

const RADIUS_PRESETS = [
  { km: 1, label: "My street", icon: "🏘️" },
  { km: 5, label: "My neighborhood", icon: "🏙️" },
  { km: 10, label: "My city", icon: "🌆" },
  { km: 25, label: "Nearby cities", icon: "🗺️" },
  { km: 50, label: "My region", icon: "🌍" },
  { km: 100, label: "Wide area", icon: "🌎" },
];

const REGIONS: Array<{
  id: string;
  name: string;
  locales: Locale[];
}> = [
  { id: "global", name: "Global", locales: ["en", "es", "fr", "pt"] },
  { id: "europe", name: "Europe", locales: ["cs", "de", "ru", "uk", "it", "pl", "nl", "sv"] },
  { id: "asia", name: "Asia", locales: ["zh", "hi", "ja", "ko", "vi", "id", "th"] },
  { id: "mena", name: "Middle East & North Africa", locales: ["ar", "tr"] },
];

export function LanguageRegionClient() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const { geoDistance, setGeoDistance } = useUIStore();
  const { radiusMeters, setRadiusKm, isEnabled, requestLocation, clearLocation } =
    useLocationFilter();

  // Convert meters to km for display
  const currentRadiusKm = Math.round((geoDistance ?? radiusMeters) / 1000);
  const [localRadius, setLocalRadius] = useState(currentRadiusKm);

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

  const handleLanguageChange = (locale: Locale) => {
    if (locale === currentLocale) return;

    startTransition(() => {
      // Update cookie and redirect to new locale
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;

      // Replace current locale in pathname
      const newPathname = pathname.replace(`/${currentLocale}`, `/${locale}`);
      router.push(newPathname);
      router.refresh();
    });
  };

  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setLocalRadius(newRadius);
    setGeoDistance(newRadius * 1000);
    setRadiusKm(newRadius);
  };

  const handlePresetClick = (km: number) => {
    setLocalRadius(km);
    setGeoDistance(km * 1000);
    setRadiusKm(km);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl animate-pulse delay-1000" />
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
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Language & Region</h1>
              <p className="text-sm text-muted-foreground">
                Customize your language and location preferences
              </p>
            </div>
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
                <h2 className="text-lg font-semibold">Language</h2>
                <Badge variant="secondary" className="ml-auto">
                  {locales.length} languages
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Choose your preferred language. The interface will update immediately.
              </p>

              {/* Search and region filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search languages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  <Button
                    variant={selectedRegion === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRegion(null)}
                    className="whitespace-nowrap"
                  >
                    All regions
                  </Button>
                  {REGIONS.map((region) => (
                    <Button
                      key={region.id}
                      variant={selectedRegion === region.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRegion(region.id)}
                      className="whitespace-nowrap"
                    >
                      {region.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Language list */}
              <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
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
                          meta.direction === "rtl" && "flex-row-reverse"
                        )}
                      >
                        {/* Flag */}
                        <div className="text-3xl">{meta.flag}</div>

                        {/* Language info */}
                        <div
                          className={cn(
                            "flex-1 text-left",
                            meta.direction === "rtl" && "text-right"
                          )}
                        >
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
                  <p className="text-muted-foreground">No languages found</p>
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
                <Map className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Search Radius</h2>
                <Badge variant="secondary" className="ml-auto">
                  {localRadius} km
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Set your default search radius for finding nearby food items. You can always adjust
                it when browsing.
              </p>

              {/* Radius slider */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Slider
                    value={[localRadius]}
                    onValueChange={handleRadiusChange}
                    min={1}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 km</span>
                    <span className="font-medium text-base text-foreground">{localRadius} km</span>
                    <span>100 km</span>
                  </div>
                </div>

                {/* Preset buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {RADIUS_PRESETS.map((preset) => (
                    <Button
                      key={preset.km}
                      variant={localRadius === preset.km ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePresetClick(preset.km)}
                      className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-lg">{preset.icon}</span>
                        <span className="font-semibold">{preset.km} km</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-normal">
                        {preset.label}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </Glass>
          </motion.div>

          {/* Location Permissions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Glass variant="subtle" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Navigation className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-semibold">Location Services</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Enable location services to find food near you automatically.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {!isEnabled ? (
                  <Button onClick={requestLocation} variant="default" size="sm" className="gap-2">
                    <MapPin className="w-4 h-4" />
                    Enable location
                  </Button>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Location enabled
                    </div>
                    <Button onClick={clearLocation} variant="outline" size="sm" className="gap-2">
                      Clear location data
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
                  <h3 className="font-medium text-sm mb-2">Pro tips</h3>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Your radius setting is saved and applies across all pages</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Language changes take effect immediately without reload</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Location data is never stored on our servers</span>
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
