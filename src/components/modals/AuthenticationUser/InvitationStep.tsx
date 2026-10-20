"use client";

import { sendInvitations } from "@/app/actions/invitation";
import { Button } from "@/components/ui/button";
import { EmailInput } from "@/components/ui/email-input";
import { createLogger } from "@/lib/logger";
import { ArrowRight, CheckCircle2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import { useState, useTransition } from "react";

const logger = createLogger("InvitationStep");

interface InvitationStepProps {
  onClose: () => void;
}

export const InvitationStep: React.FC<InvitationStepProps> = ({ onClose }) => {
  const t = useTranslations("AuthFlow");
  const [emails, setEmails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInvite = () => {
    if (emails.length === 0) {
      setError(t("invite.errorEmpty"));
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await sendInvitations(emails);
        if (result.success) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          // The action's message is its own; the fallback is a key, not a
          // sentence, so this component has nothing English left to leak.
          setError(result.success ? null : t("invite.errorFailed"));
        }
      } catch (err) {
        logger.error("Failed to invite users", err as Error);
        setError(t("invite.errorUnexpected"));
      }
    });
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500 delay-150">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">{t("invite.sentTitle")}</h3>
        <p className="text-muted-foreground max-w-[250px] mx-auto">{t("invite.sentBody")}</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">{t("invite.title")}</h2>
        <p className="text-muted-foreground max-w-[320px] mx-auto text-sm">{t("invite.body")}</p>
      </div>

      <div className="space-y-6">
        <div>
          <span className="text-sm font-medium text-foreground block mb-2 ps-1">{t("invite.labels")}</span>
          <EmailInput
            emails={emails}
            onEmailsChange={setEmails}
            placeholder="colleague@example.com"
            disabled={isPending}
          />
          {error && (
            <p
              className="text-xs text-red-500 mt-2 ps-1 font-medium animate-in slide-in-from-top-1 fade-in"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleInvite}
            disabled={isPending || emails.length === 0}
            className="w-full h-12 brand-gradient text-white font-semibold rounded-xl text-base hover:brand-gradient-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-70 disabled:hover:scale-100"
          >
            {isPending ? (
              t("invite.sending")
            ) : (
              <span className="flex items-center gap-2">
                {t("invite.send")} <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            disabled={isPending}
            className="w-full h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
          >
            {t("invite.later")}
          </Button>
        </div>
      </div>
    </div>
  );
};
