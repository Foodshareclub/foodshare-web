"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Mail, MapPin, PartyPopper, Sparkles } from "lucide-react";
import { CHAT_BANNER_COPY } from "./chat-copy";

interface ChatExchangeBannersProps {
  isSharer: boolean;
  isAccepted: boolean;
  isAccepting: boolean;
  isCompleting: boolean;
  isCompleted: boolean;
  otherParticipantFirstName?: string;
  onAcceptAndShareAddress: () => void;
  onCompleteExchange: () => void;
}

export function ChatExchangeBanners({
  isSharer,
  isAccepted,
  isAccepting,
  isCompleting,
  isCompleted,
  otherParticipantFirstName,
  onAcceptAndShareAddress,
  onCompleteExchange,
}: ChatExchangeBannersProps) {
  return (
    <>
      <AnimatePresence>
        {isSharer && !isAccepted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border overflow-hidden"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{CHAT_BANNER_COPY.readyToShare}</p>
                  <p className="text-xs text-muted-foreground">{CHAT_BANNER_COPY.shareAddressHint}</p>
                </div>
                <Button
                  onClick={onAcceptAndShareAddress}
                  disabled={isAccepting}
                  className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 border-0 gap-2"
                >
                  {isAccepting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      {CHAT_BANNER_COPY.acceptingLabel}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {CHAT_BANNER_COPY.acceptAndShareAddress}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAccepted && !isCompleted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border overflow-hidden"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <PartyPopper className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{CHAT_BANNER_COPY.pickupHappened}</p>
                  <p className="text-xs text-muted-foreground">{CHAT_BANNER_COPY.markCompleteHint}</p>
                </div>
                <Button
                  onClick={onCompleteExchange}
                  disabled={isCompleting}
                  className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 border-0 gap-2"
                >
                  {isCompleting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      {CHAT_BANNER_COPY.completingLabel}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      {CHAT_BANNER_COPY.markComplete}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border overflow-hidden"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 flex items-center gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  {CHAT_BANNER_COPY.exchangeComplete}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {CHAT_BANNER_COPY.emailsSentPrefix}
                  {otherParticipantFirstName || CHAT_BANNER_COPY.defaultOtherParty}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
