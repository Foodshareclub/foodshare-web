"use client";

/**
 * MFA Verification Component
 * Challenge screen for verifying MFA during admin login
 *
 * Features:
 * - SMS and Email verification
 * - Backup code support
 * - Rate limiting feedback
 * - Resend functionality
 */

import React, { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Loader2, AlertCircle, Shield, RefreshCw } from "lucide-react";
import { MFAService } from "@/lib/security/mfa";

interface MFAVerificationProps {
  profileId: string;
  onVerified?: () => void;
  onCancel?: () => void;
}

// React 19: Dedicated Submit Button utilizing useFormStatus
function SubmitButton({ pendingText, defaultText, disabled }: { pendingText: string, defaultText: React.ReactNode, disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{pendingText}</span>
        </>
      ) : (
        <span>{defaultText}</span>
      )}
    </button>
  );
}

interface ActionState {
  error?: string;
  success?: boolean;
}

export const MFAVerification: React.FC<MFAVerificationProps> = ({
  profileId,
  onVerified,
  onCancel,
}) => {
  const [challengeId, setChallengeId] = useState("");
  const [method, _setMethod] = useState<"sms" | "email">("email");
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [showBackupCodeInput, setShowBackupCodeInput] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [initError, setInitError] = useState("");

  // Start challenge on mount
  useEffect(() => {
    async function initChallenge() {
      try {
        const result = await MFAService.createChallenge(profileId, method);
        if (!result.success) {
          if (result.error === "rate_limit_exceeded") {
            setInitError(`Too many attempts. Try again after ${result.locked_until}`);
          } else {
            setInitError(result.error || "Failed to send verification code");
          }
          return;
        }
        setChallengeId(result.challenge_id || "");
        setCanResend(false);
        setResendCountdown(60);
      } catch {
        setInitError("Failed to send verification code. Please try again.");
      }
    }
    initChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setCanResend(true), 0);
    }
  }, [resendCountdown]);

  // React 19: Action State for Verification
  const [verifyState, verifyAction] = useActionState<ActionState, FormData>(
    async (_prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const code = formData.get("code") as string;
      
      if (!code || code.length !== 6) {
        return { error: "Please enter a valid 6-digit code" };
      }

      try {
        const result = await MFAService.verifyChallenge(challengeId, code, profileId);
        if (!result.success) {
          if (result.attempts_remaining !== undefined) {
            setAttemptsRemaining(result.attempts_remaining);
            return { error: `Invalid code. ${result.attempts_remaining} attempts remaining.` };
          } else if (result.error === "challenge_expired") {
            // Attempt inline resend
            const retryResult = await MFAService.createChallenge(profileId, method);
            if (retryResult.success) {
              setChallengeId(retryResult.challenge_id || "");
              setCanResend(false);
              setResendCountdown(60);
              return { error: "Code expired. Sent a new one." };
            }
          }
          return { error: result.error || "Verification failed" };
        }

        if (onVerified) onVerified();
        return { success: true };
      } catch {
        return { error: "Verification failed. Please try again." };
      }
    },
    {}
  );

  // React 19: Action State for Backup Code Verification
  const [backupVerifyState, backupVerifyAction] = useActionState<ActionState, FormData>(
    async (_prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const code = formData.get("backupCode") as string;
      
      if (!code) {
        return { error: "Please enter a backup code" };
      }

      try {
        const result = await MFAService.verifyBackupCode(profileId, code);
        if (!result.success) {
          return { error: result.error || "Invalid backup code" };
        }
        if (onVerified) onVerified();
        return { success: true };
      } catch {
        return { error: "Failed to verify backup code. Please try again." };
      }
    },
    {}
  );

  // React 19: Action State for Resend
  const [resendState, resendAction] = useActionState<ActionState, FormData>(
    async (): Promise<ActionState> => {
      try {
        const result = await MFAService.createChallenge(profileId, method);
        if (!result.success) {
          return { error: result.error || "Failed to resend code" };
        }
        setChallengeId(result.challenge_id || "");
        setCanResend(false);
        setResendCountdown(60);
        return { success: true };
      } catch {
        return { error: "Failed to resend. Please try again." };
      }
    },
    {}
  );

  // Render backup code input
  if (showBackupCodeInput) {
    return (
      <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-lg">
        <div className="space-y-6">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Enter Backup Code</h2>
            <p className="text-muted-foreground">
              Use one of your backup codes to verify your identity
            </p>
          </div>

          {(backupVerifyState?.error) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{backupVerifyState.error}</p>
            </div>
          )}

          <form action={backupVerifyAction}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground/80 mb-2">Backup Code</label>
              <input
                type="text"
                name="backupCode"
                placeholder="XXXXXXXXXXXX"
                className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-center font-mono"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBackupCodeInput(false)}
                className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Back
              </button>
              <div className="flex-1">
                <SubmitButton pendingText="Verifying..." defaultText="Verify" />
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Render normal verification
  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-lg">
      <div className="space-y-6">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Two-Factor Authentication</h2>
          <p className="text-muted-foreground">
            Enter the verification code sent to your {method === "email" ? "email" : "phone"}
          </p>
        </div>

        {(initError || resendState?.error || verifyState?.error) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800">{initError || resendState?.error || verifyState?.error}</p>
              {attemptsRemaining <= 2 && attemptsRemaining > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Warning: Only {attemptsRemaining} attempts remaining!
                </p>
              )}
            </div>
          </div>
        )}

        <form action={verifyAction}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              name="code"
              placeholder="000000"
              className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest font-mono"
              maxLength={6}
              autoFocus
            />
            <p className="mt-1 text-xs text-muted-foreground text-center">
              Code expires in 5 minutes
            </p>
          </div>

          <SubmitButton pendingText="Verifying..." defaultText="Verify Code" />
        </form>

        <div className="flex items-center justify-between text-sm mt-4">
          <form action={resendAction}>
            <SubmitButton 
              disabled={!canResend}
              pendingText="Resending..."
              defaultText={
                <span className="flex items-center gap-1 text-primary hover:text-primary/80">
                  <RefreshCw className="w-4 h-4" />
                  {canResend ? "Resend Code" : `Resend in ${resendCountdown}s`}
                </span>
              }
            />
          </form>

          <button
            type="button"
            onClick={() => setShowBackupCodeInput(true)}
            className="text-muted-foreground hover:text-foreground underline"
          >
            Use Backup Code
          </button>
        </div>

        {onCancel && (
          <div className="text-center pt-4 border-t border-border mt-4">
            <button
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground underline text-sm"
            >
              Cancel and Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
