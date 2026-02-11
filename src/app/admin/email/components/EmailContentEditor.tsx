"use client";

/**
 * EmailContentEditor - Production-ready email content editor with visual settings
 * Features:
 * - Real-time preview with device simulation (desktop/tablet/mobile)
 * - Visual settings panel (typography, colors, spacing)
 * - Text manipulation reflected in preview
 * - Dark mode preview support
 * - Email template header/footer with branding
 * - Zoom controls for detailed inspection
 * - Copy HTML functionality
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Smartphone,
  Tablet,
  X,
  Eye,
  Settings2,
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Mail,
  ChevronDown,
  RotateCcw,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

// Types
export interface EmailVisualSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textColor: string;
  backgroundColor: string;
  linkColor: string;
  headerColor: string;
  buttonColor: string;
  textAlign: "left" | "center" | "right";
  padding: number;
  darkMode: boolean;
  showHeader: boolean;
  showFooter: boolean;
  borderRadius: number;
}

export interface EmailContentEditorProps {
  to: string;
  subject: string;
  html: string;
  onClose: () => void;
  settings?: Partial<EmailVisualSettings>;
  onSettingsChange?: (settings: EmailVisualSettings) => void;
}

type DeviceType = "desktop" | "tablet" | "mobile";

// Constants
const DEFAULT_SETTINGS: EmailVisualSettings = {
  fontFamily: "system-ui",
  fontSize: 16,
  lineHeight: 1.6,
  letterSpacing: 0,
  textColor: "#363a57",
  backgroundColor: "#ffffff",
  linkColor: "#ff2d55",
  headerColor: "#ff2d55",
  buttonColor: "#ff2d55",
  textAlign: "left",
  padding: 40,
  darkMode: false,
  showHeader: true,
  showFooter: true,
  borderRadius: 12,
};

const FONT_FAMILIES = [
  { value: "system-ui", label: "System Default" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Helvetica Neue', sans-serif", label: "Helvetica" },
  { value: "Verdana, sans-serif", label: "Verdana" },
];

const DEVICE_CONFIGS: Record<DeviceType, { width: number; label: string }> = {
  desktop: { width: 600, label: "Desktop" },
  tablet: { width: 480, label: "Tablet" },
  mobile: { width: 375, label: "Mobile" },
};

const PRESET_COLORS = [
  "#ff2d55",
  "#e6284d",
  "#00A699",
  "#FC642D",
  "#f59e0b",
  "#10b981",
  "#6366f1",
  "#8b5cf6",
  "#363a57",
  "#64748b",
];

// Transform HTML with visual settings
function transformHtmlWithSettings(html: string, settings: EmailVisualSettings): string {
  // Apply link color to all anchor tags
  let transformed = html.replace(
    /<a /g,
    `<a style="color: ${settings.linkColor}; text-decoration: underline;" `
  );

  // Apply button color to buttons/CTAs
  transformed = transformed.replace(
    /style="([^"]*)(background-color:\s*)(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3})/gi,
    `style="$1$2${settings.buttonColor}`
  );

  return transformed;
}

// Generate full email HTML for export
function generateFullEmailHtml(
  to: string,
  subject: string,
  html: string,
  settings: EmailVisualSettings
): string {
  const transformedContent = transformHtmlWithSettings(html, settings);
  const bgColor = settings.darkMode ? "#18181b" : settings.backgroundColor;
  const textColor = settings.darkMode ? "#e4e4e7" : settings.textColor;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: ${settings.fontFamily};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${bgColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${settings.darkMode ? "#27272a" : "#ffffff"}; border-radius: ${settings.borderRadius}px;">
          ${
            settings.showHeader
              ? `
          <tr>
            <td style="background-color: ${settings.headerColor}; padding: 40px 30px; text-align: center; border-radius: ${settings.borderRadius}px ${settings.borderRadius}px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${subject}</h1>
            </td>
          </tr>
          `
              : ""
          }
          <tr>
            <td style="padding: ${settings.padding}px; font-size: ${settings.fontSize}px; line-height: ${settings.lineHeight}; letter-spacing: ${settings.letterSpacing}px; color: ${textColor}; text-align: ${settings.textAlign};">
              ${transformedContent}
            </td>
          </tr>
          ${
            settings.showFooter
              ? `
          <tr>
            <td style="background-color: ${settings.headerColor}; padding: 24px; text-align: center; border-radius: 0 0 ${settings.borderRadius}px ${settings.borderRadius}px;">
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 13px;">FoodShare © ${new Date().getFullYear()}</p>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 12px;">
                <a href="#" style="color: #fff; text-decoration: underline;">Privacy</a> • 
                <a href="#" style="color: #fff; text-decoration: underline;">Terms</a> • 
                <a href="#" style="color: #fff; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          `
              : ""
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Main Component
export function EmailContentEditor({
  to,
  subject,
  html,
  onClose,
  settings: initialSettings,
  onSettingsChange,
}: EmailContentEditorProps): React.ReactElement {
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [settings, setSettings] = useState<EmailVisualSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updateSettings = (updates: Partial<EmailVisualSettings>): void => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const resetSettings = (): void => {
    setSettings(DEFAULT_SETTINGS);
    onSettingsChange?.(DEFAULT_SETTINGS);
  };

  const handleCopyHtml = async (): Promise<void> => {
    const fullHtml = generateFullEmailHtml(to, subject, html, settings);
    await navigator.clipboard.writeText(fullHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deviceConfig = DEVICE_CONFIGS[device];
  const deviceIcons = {
    desktop: <Monitor className="h-4 w-4" />,
    tablet: <Tablet className="h-4 w-4" />,
    mobile: <Smartphone className="h-4 w-4" />,
  };

  return (
    <div
      className={cn(
        "space-y-4",
        isFullscreen && "fixed inset-0 z-50 bg-background p-6 overflow-auto"
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Device Selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
          {(Object.keys(DEVICE_CONFIGS) as DeviceType[]).map((key) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Button
                  variant={device === key ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDevice(key)}
                  className="gap-2 h-8"
                >
                  {deviceIcons[key]}
                  <span className="hidden sm:inline">{DEVICE_CONFIGS[key].label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{DEVICE_CONFIGS[key].label} Preview</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
          <span className="text-xs font-medium tabular-nums w-12 text-center">{zoom}%</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                disabled={zoom >= 150}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <Button variant={showSettings ? "secondary" : "outline"} size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Visual Settings</span>
                <ChevronDown
                  className={cn("h-3 w-3 transition-transform", showSettings && "rotate-180")}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <VisualSettingsPanel
                settings={settings}
                onUpdate={updateSettings}
                onReset={resetSettings}
              />
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateSettings({ darkMode: !settings.darkMode })}
              >
                {settings.darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{settings.darkMode ? "Light" : "Dark"} Mode Preview</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopyHtml}>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? "Copied!" : "Copy HTML"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Email Preview Frame */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${device}-${zoom}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="flex justify-center overflow-auto"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
        >
          <div
            className={cn(
              "rounded-xl border-2 overflow-hidden shadow-2xl transition-all duration-300",
              settings.darkMode ? "border-zinc-700 bg-zinc-900" : "border-border/50 bg-white"
            )}
            style={{
              width: deviceConfig.width,
              maxWidth: "100%",
              borderRadius: `${settings.borderRadius}px`,
            }}
          >
            {/* Email Client Header */}
            <div
              className="p-4 border-b"
              style={{
                backgroundColor: settings.darkMode ? "#1f1f23" : "#f8f8f8",
                borderColor: settings.darkMode ? "#27272a" : "#e5e5e5",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${settings.headerColor}20` }}
                >
                  <Mail className="h-5 w-5" style={{ color: settings.headerColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-sm truncate"
                    style={{ color: settings.darkMode ? "#fff" : "#1a1a1a" }}
                  >
                    FoodShare
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: settings.darkMode ? "#a1a1aa" : "#666" }}
                  >
                    contact@foodshare.club
                  </p>
                </div>
                <div className="text-xs" style={{ color: settings.darkMode ? "#71717a" : "#888" }}>
                  {new Date().toLocaleDateString()}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs" style={{ color: settings.darkMode ? "#71717a" : "#888" }}>
                  To:{" "}
                  <span style={{ color: settings.darkMode ? "#d4d4d8" : "#333" }}>
                    {to || "recipient@example.com"}
                  </span>
                </p>
                <p
                  className="font-semibold"
                  style={{
                    color: settings.darkMode ? "#fff" : "#1a1a1a",
                    fontSize: device === "mobile" ? "14px" : "16px",
                  }}
                >
                  {subject || "No subject"}
                </p>
              </div>
            </div>

            {/* Email Template Container */}
            <div
              className="overflow-auto"
              style={{
                backgroundColor: settings.darkMode ? "#18181b" : settings.backgroundColor,
                maxHeight: isFullscreen ? "calc(100vh - 280px)" : "500px",
              }}
            >
              {/* Email Template Header */}
              {settings.showHeader && (
                <div
                  style={{
                    backgroundColor: settings.headerColor,
                    padding: device === "mobile" ? "30px 20px" : "40px 30px",
                    textAlign: "center",
                  }}
                >
                  <div
                    className="inline-flex items-center justify-center rounded-full bg-white/20 p-3 mb-3"
                    style={{ border: "3px solid rgba(255,255,255,0.3)" }}
                  >
                    <svg
                      className="h-8 w-8 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <h1
                    style={{
                      margin: 0,
                      color: "#ffffff",
                      fontSize: device === "mobile" ? "20px" : "24px",
                      fontWeight: 700,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {subject || "Email Preview"}
                  </h1>
                </div>
              )}

              {/* Email Body - Reflects Visual Settings */}
              <div
                className="prose prose-sm max-w-none"
                style={{
                  fontFamily: settings.fontFamily,
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  letterSpacing: `${settings.letterSpacing}px`,
                  color: settings.darkMode ? "#e4e4e7" : settings.textColor,
                  textAlign: settings.textAlign,
                  padding: `${settings.padding}px`,
                  backgroundColor: settings.darkMode ? "#27272a" : "#fafafa",
                }}
                dangerouslySetInnerHTML={{
                  __html: html
                    ? transformHtmlWithSettings(html, settings)
                    : `<p style="color: ${settings.darkMode ? "#71717a" : "#999"}; font-style: italic;">Start typing to see your email content here...</p>`,
                }}
              />

              {/* Email Template Footer */}
              {settings.showFooter && (
                <div
                  style={{
                    backgroundColor: settings.headerColor,
                    padding: device === "mobile" ? "20px" : "24px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(255,255,255,0.9)",
                      fontSize: "13px",
                    }}
                  >
                    FoodShare © {new Date().getFullYear()}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "12px",
                    }}
                  >
                    <a href="#" style={{ color: "#fff", textDecoration: "underline" }}>
                      Privacy
                    </a>
                    {" • "}
                    <a href="#" style={{ color: "#fff", textDecoration: "underline" }}>
                      Terms
                    </a>
                    {" • "}
                    <a href="#" style={{ color: "#fff", textDecoration: "underline" }}>
                      Unsubscribe
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Preview Info */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          {deviceConfig.label} ({deviceConfig.width}px)
        </span>
        <Separator orientation="vertical" className="h-3" />
        <span>Actual rendering may vary by email client</span>
      </div>
    </div>
  );
}

// Visual Settings Panel Component
function VisualSettingsPanel({
  settings,
  onUpdate,
  onReset,
}: {
  settings: EmailVisualSettings;
  onUpdate: (updates: Partial<EmailVisualSettings>) => void;
  onReset: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"typography" | "colors" | "layout">("typography");

  return (
    <div className="divide-y divide-border/50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted/30">
        <span className="text-sm font-medium">Visual Settings</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset to defaults</TooltipContent>
        </Tooltip>
      </div>

      {/* Tabs */}
      <div className="p-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full h-8 p-0.5 bg-muted/50">
            <TabsTrigger value="typography" className="flex-1 h-7 text-xs gap-1">
              <Type className="h-3 w-3" /> Typography
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex-1 h-7 text-xs gap-1">
              <Palette className="h-3 w-3" /> Colors
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex-1 h-7 text-xs gap-1">
              <AlignLeft className="h-3 w-3" /> Layout
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="p-3 space-y-4">
        {activeTab === "typography" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Font Family</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(v) => onUpdate({ fontFamily: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font.value} value={font.value} className="text-xs">
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Font Size</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {settings.fontSize}px
                </span>
              </div>
              <Slider
                value={[settings.fontSize]}
                onValueChange={([v]) => onUpdate({ fontSize: v })}
                min={12}
                max={24}
                step={1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Line Height</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {settings.lineHeight}
                </span>
              </div>
              <Slider
                value={[settings.lineHeight]}
                onValueChange={([v]) => onUpdate({ lineHeight: v })}
                min={1.2}
                max={2.2}
                step={0.1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Letter Spacing</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {settings.letterSpacing}px
                </span>
              </div>
              <Slider
                value={[settings.letterSpacing]}
                onValueChange={([v]) => onUpdate({ letterSpacing: v })}
                min={-1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>
          </>
        )}

        {activeTab === "colors" && (
          <>
            <ColorPicker
              label="Text Color"
              value={settings.textColor}
              onChange={(v) => onUpdate({ textColor: v })}
            />
            <ColorPicker
              label="Background"
              value={settings.backgroundColor}
              onChange={(v) => onUpdate({ backgroundColor: v })}
            />
            <ColorPicker
              label="Link Color"
              value={settings.linkColor}
              onChange={(v) => onUpdate({ linkColor: v })}
            />
            <ColorPicker
              label="Header/Footer"
              value={settings.headerColor}
              onChange={(v) => onUpdate({ headerColor: v })}
            />
            <ColorPicker
              label="Button Color"
              value={settings.buttonColor}
              onChange={(v) => onUpdate({ buttonColor: v })}
            />
          </>
        )}

        {activeTab === "layout" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Text Alignment</Label>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((align) => (
                  <Button
                    key={align}
                    variant={settings.textAlign === align ? "secondary" : "outline"}
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => onUpdate({ textAlign: align })}
                  >
                    {align === "left" && <AlignLeft className="h-4 w-4" />}
                    {align === "center" && <AlignCenter className="h-4 w-4" />}
                    {align === "right" && <AlignRight className="h-4 w-4" />}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Content Padding</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {settings.padding}px
                </span>
              </div>
              <Slider
                value={[settings.padding]}
                onValueChange={([v]) => onUpdate({ padding: v })}
                min={16}
                max={64}
                step={4}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Border Radius</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {settings.borderRadius}px
                </span>
              </div>
              <Slider
                value={[settings.borderRadius]}
                onValueChange={([v]) => onUpdate({ borderRadius: v })}
                min={0}
                max={24}
                step={2}
                className="w-full"
              />
            </div>
            <Separator className="my-2" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Show Header</Label>
                <Switch
                  checked={settings.showHeader}
                  onCheckedChange={(v) => onUpdate({ showHeader: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Show Footer</Label>
                <Switch
                  checked={settings.showFooter}
                  onCheckedChange={(v) => onUpdate({ showFooter: v })}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Color Picker Component
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 rounded border border-border/50 shadow-sm"
            style={{ backgroundColor: value }}
          />
          <span className="text-xs text-muted-foreground font-mono uppercase">{value}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            className={cn(
              "h-6 w-6 rounded-md border-2 transition-all hover:scale-110",
              value === color ? "border-foreground shadow-md" : "border-transparent"
            )}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
        <label className="h-6 w-6 rounded-md border-2 border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          <span className="text-[10px] text-muted-foreground">+</span>
        </label>
      </div>
    </div>
  );
}
