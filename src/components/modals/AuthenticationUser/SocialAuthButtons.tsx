"use client";

import React from "react";
import Image from "next/image";
import google from "@/assets/google.svg";
import facebook from "@/assets/facebookblue.svg";
import apple from "@/assets/apple.svg";
import { Button } from "@/components/ui/button";
import { getEnabledProviders, isOAuthEnabled, type OAuthProvider } from "@/lib/config/oauth";

interface SocialAuthButtonsProps {
  onSelectProvider: (provider: OAuthProvider) => void;
  disabled?: boolean;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onSelectProvider,
  disabled = false,
}) => {
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
          className="w-full h-11 border-border rounded-lg font-medium text-sm hover:border-foreground hover:bg-muted transition-all"
        >
          <Image src={google} alt="Google" width={20} height={20} className="w-5 h-5 mr-3" />
          Continue with Google
        </Button>
      )}

      {isOAuthEnabled("facebook") && (
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onSelectProvider("facebook")}
          variant="outline"
          className="w-full h-11 border-border rounded-lg font-medium text-sm hover:border-foreground hover:bg-muted transition-all"
        >
          <Image src={facebook} alt="Facebook" width={20} height={20} className="w-5 h-5 mr-3" />
          Continue with Facebook
        </Button>
      )}

      {isOAuthEnabled("apple") && (
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onSelectProvider("apple")}
          variant="outline"
          className="w-full h-11 border-border rounded-lg font-medium text-sm hover:border-foreground hover:bg-muted transition-all"
        >
          <Image src={apple} alt="Apple" width={20} height={20} className="w-5 h-5 mr-3" />
          Continue with Apple
        </Button>
      )}
    </div>
  );
};
