"use client";

/**
 * Telegram Integration Card Component
 *
 * Enterprise Liquid Glass UI for 1-Click Telegram Account Linking & Notifications.
 * Features:
 * - Real-time link status detection & polling
 * - 1-Click deep link connection
 * - QR code for mobile scanning
 * - Rich status indicators and unlinking workflow
 */

import React, { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ExternalLink,
  QrCode,
  Unlink,
  Copy,
  Check,
  RefreshCw,
  Bell,
  MessageSquare,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateTelegramLink, unlinkTelegram } from "@/app/actions/telegram";

export interface TelegramIntegrationCardProps {
  userId?: string;
  initialLinked?: boolean;
  initialUsername?: string | null;
  className?: string;
  onStatusChange?: (isLinked: boolean) => void;
}

import { createClient } from "@/lib/supabase/client";

export function TelegramIntegrationCard({
  userId,
  initialLinked = false,
  initialUsername = null,
  className = "",
  onStatusChange,
}: TelegramIntegrationCardProps) {
  const [isLinked, setIsLinked] = useState(initialLinked);
  const [username, setUsername] = useState<string | null>(initialUsername);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isConfirmingUnlink, setIsConfirmingUnlink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sync prop updates
  useEffect(() => {
    setIsLinked(initialLinked);
    setUsername(initialUsername);
  }, [initialLinked, initialUsername]);

  // Realtime status detection when a link token has been generated
  useEffect(() => {
    if (!deepLink || isLinked) return;

    const supabase = createClient();
    const channelConfig = userId
      ? { event: "UPDATE" as const, schema: "public", table: "profiles", filter: `id=eq.${userId}` }
      : { event: "UPDATE" as const, schema: "public", table: "profiles" };

    const channel = supabase
      .channel(userId ? `telegram-auth-listener-${userId}` : "telegram-auth-listener")
      .on("postgres_changes", channelConfig, (payload) => {
        const newRecord = payload.new as {
          telegram_id?: number | null;
          telegram_username?: string | null;
        };
        if (newRecord.telegram_id) {
          setIsLinked(true);
          setUsername(newRecord.telegram_username || null);
          setDeepLink(null);
          setShowQr(false);
          onStatusChange?.(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deepLink, isLinked, onStatusChange, userId]);

  const handleConnect = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await generateTelegramLink();
      if (res.success && res.data) {
        setDeepLink(res.data.deepLink);
        // Open Telegram link in a new tab
        window.open(res.data.deepLink, "_blank", "noopener,noreferrer");
      } else {
        setErrorMessage(!res.success ? res.error.message : "Failed to generate connection link.");
      }
    });
  };

  const handleCopyLink = async () => {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleUnlink = () => {
    setErrorMessage(null);
    setIsUnlinking(true);
    startTransition(async () => {
      const res = await unlinkTelegram();
      setIsUnlinking(false);
      setIsConfirmingUnlink(false);
      if (res.success) {
        setIsLinked(false);
        setUsername(null);
        setDeepLink(null);
        onStatusChange?.(false);
      } else {
        setErrorMessage(
          !res.success ? res.error.message : "Failed to disconnect Telegram account."
        );
      }
    });
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 ${className}`}
    >
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#229ED9]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0088cc] to-[#229ED9] text-white shadow-lg shadow-[#0088cc]/25">
            <Send className="h-6 w-6 -translate-x-0.5 translate-y-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Telegram Integration
              </h3>
              {isLinked ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground border-border/50"
                >
                  Not Linked
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Receive real-time instant alerts for listings, direct messages, and food pickups.
            </p>
          </div>
        </div>

        {isLinked && username && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-muted/60 dark:bg-muted/30 border border-border/40 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="text-muted-foreground">User:</span>
            <span className="font-semibold text-foreground">@{username}</span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {errorMessage}
        </div>
      )}

      {/* Connected State */}
      <AnimatePresence mode="wait">
        {isLinked ? (
          <motion.div
            key="linked-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-5 space-y-4"
          >
            {/* Features Enabled Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/10 flex items-start gap-2.5">
                <MessageSquare className="h-4 w-4 text-[#0088cc] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Direct Chats</p>
                  <p className="text-[11px] text-muted-foreground">Instant message alerts</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/10 flex items-start gap-2.5">
                <Bell className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Nearby Food</p>
                  <p className="text-[11px] text-muted-foreground">New surplus nearby</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/10 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Reservations</p>
                  <p className="text-[11px] text-muted-foreground">Pickup confirmations</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-[#0088cc]/30 text-[#0088cc] hover:bg-[#0088cc]/10"
                onClick={() => window.open("https://t.me/foodshare_club_bot", "_blank")}
              >
                <Send className="h-3.5 w-3.5" />
                Open Telegram Bot
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Button>

              {isConfirmingUnlink ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Disconnect account?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isUnlinking}
                    onClick={handleUnlink}
                    className="h-8 text-xs"
                  >
                    {isUnlinking ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Unlink className="h-3 w-3 mr-1" />
                    )}
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isUnlinking}
                    onClick={() => setIsConfirmingUnlink(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingUnlink(true)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  <Unlink className="h-3.5 w-3.5 mr-1.5" />
                  Disconnect
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          /* Unlinked State */
          <motion.div
            key="unlinked-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/40 dark:bg-white/5 border border-border/50 p-4 rounded-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium text-foreground">
                    Connect Telegram with 1-Click
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tap below to open Telegram and bind your account securely without passwords or
                  OTPs.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleConnect}
                  disabled={isPending}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#0088cc] to-[#229ED9] hover:opacity-90 text-white font-medium shadow-md shadow-[#0088cc]/20 gap-2"
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating Link...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Connect Telegram
                      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowQr(!showQr)}
                  title="Scan QR Code with Phone"
                  className="shrink-0 border-border/60 hover:bg-muted"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Waiting for connection pulse banner */}
            {deepLink && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3.5 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 text-foreground">
                  <RefreshCw className="h-4 w-4 text-[#0088cc] animate-spin shrink-0" />
                  <span>
                    Waiting for you to tap <b>Start</b> in Telegram...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyLink}
                    className="h-7 px-2.5 text-xs text-[#0088cc] hover:bg-[#0088cc]/20 gap-1.5"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(deepLink, "_blank")}
                    className="h-7 px-2.5 text-xs border-[#0088cc]/30 text-[#0088cc] hover:bg-[#0088cc]/20"
                  >
                    Open Bot
                  </Button>
                </div>
              </motion.div>
            )}

            {/* QR Code expansion */}
            {showQr && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center p-6 rounded-xl bg-white/80 dark:bg-black/60 border border-white/20 shadow-lg text-center"
              >
                <p className="text-xs font-semibold text-foreground mb-3">
                  Scan with your phone to open Telegram
                </p>
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                  {/* High quality QR code via standard QR endpoint */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      deepLink || "https://t.me/foodshare_club_bot"
                    )}`}
                    alt="Telegram Link QR Code"
                    width={180}
                    height={180}
                    className="rounded"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Link expires in 10 minutes • Safe & encrypted
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
