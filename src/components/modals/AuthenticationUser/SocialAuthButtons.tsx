"use client";

import { useTranslations } from "next-intl";

import apple from "@/assets/apple.svg";
import facebook from "@/assets/facebookblue.svg";
import google from "@/assets/google.svg";
import { Button } from "@/components/ui/button";
import { type OAuthProvider, getEnabledProviders, isOAuthEnabled } from "@/lib/config/oauth";
import Image from "next/image";
import type React from "react";

interface SocialAuthButtonsProps {
  onSelectProvider: (provider: OAuthProvider) => void;
  disabled?: boolean;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ onSelectProvider, disabled = false }) => {
  const t = useTranslations();
  const enabledProviders = getEnabledProviders();

  if (enabledProviders.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {isOAuthEnabled("google") && (
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onSelectProvider("google")}
          variant="outline"
          className="w-full h-12 border border-border/80 rounded-xl font-semibold text-sm hover:border-foreground/50 hover:bg-muted/40 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Image src={google} alt="Google" width={20} height={20} className="w-5 h-5 me-3" />
          {t("Auth.continueWithGoogle")}
        </Button>
      )}

      {isOAuthEnabled("facebook") && (
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onSelectProvider("facebook")}
          variant="outline"
          className="w-full h-12 border border-border/80 rounded-xl font-semibold text-sm hover:border-foreground/50 hover:bg-muted/40 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Image src={facebook} alt="Facebook" width={20} height={20} className="w-5 h-5 me-3" />
          {t("Auth.continueWithFacebook")}
        </Button>
      )}

      {isOAuthEnabled("apple") && (
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onSelectProvider("apple")}
          variant="outline"
          className="w-full h-12 border border-border/80 rounded-xl font-semibold text-sm hover:border-foreground/50 hover:bg-muted/40 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Image src={apple} alt="Apple" width={20} height={20} className="w-5 h-5 me-3" />
          {t("Auth.continueWithApple")}
        </Button>
      )}
    </div>
  );
};
