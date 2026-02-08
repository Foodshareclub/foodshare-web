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

import React, { useState, useEffect } from "react";

import { Loader2, AlertCircle, Shield, RefreshCw } from "lucide-react";
import { MFAService } from "@/lib/security/mfa";

interface MFAVerificationProps {
  profileId: string;
  onVerified?: () => void;
  onCancel?: () => void;
}

export const MFAVerification: React.FC<MFAVerificationProps> = ({
  profileId,
  onVerified,
  onCancel,
}) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [method, _setMethod] = useState<"sms" | "email">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [showBackupCodeInput, setShowBackupCodeInput] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);

  // Start challenge on mount
  useEffect(() => {
    startChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCountdown]);

  // Start MFA challenge
  const startChallenge = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await MFAService.createChallenge(profileId, method);

      if (!result.success) {
        if (result.error === "rate_limit_exceeded") {
          setError(`Too many attempts. Try again after ${result.locked_until}`);
        } else {
          setError(result.error || "Failed to send verification code");
        }
        return;
      }

      setChallengeId(result.challenge_id || "");
      setCanResend(false);
      setResendCountdown(60);
    } catch {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle code verification
  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await MFAService.verifyChallenge(challengeId, verificationCode, profileId);

      if (!result.success) {
        if (result.attempts_remaining !== undefined) {
          setAttemptsRemaining(result.attempts_remaining);
          setError(`Invalid code. ${result.attempts_remaining} attempts remaining.`);
        } else if (result.error === "challenge_expired") {
          setError("Code expired. Requesting a new one...");
          await startChallenge();
        } else {
          setError(result.error || "Verification failed");
        }
        return;
      }

      // Success!
      if (onVerified) {
        onVerified();
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle backup code verification
  const handleBackupCodeVerify = async () => {
    if (!backupCode) {
      setError("Please enter a backup code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await MFAService.verifyBackupCode(profileId, backupCode);

      if (!result.success) {
        setError(result.error || "Invalid backup code");
        return;
      }

      // Success!
      if (onVerified) {
        onVerified();
      }
    } catch {
      setError("Failed to verify backup code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend
  const handleResend = async () => {
    setVerificationCode("");
    await startChallenge();
  };

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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">Backup Code</label>
            <input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.trim())}
              placeholder="XXXXXXXXXXXX"
              className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-center font-mono"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowBackupCodeInput(false)}
              className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleBackupCodeVerify}
              disabled={isLoading || !backupCode}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>Verify</>
              )}
            </button>
          </div>
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
              {attemptsRemaining <= 2 && attemptsRemaining > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Warning: Only {attemptsRemaining} attempts remaining!
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Verification Code
          </label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest font-mono"
            maxLength={6}
            autoFocus
          />
          <p className="mt-1 text-xs text-muted-foreground text-center">
            Code expires in 5 minutes
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={isLoading || verificationCode.length !== 6}
          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>Verify Code</>
          )}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            onClick={handleResend}
            disabled={!canResend || isLoading}
            className="text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            {canResend ? "Resend Code" : `Resend in ${resendCountdown}s`}
          </button>

          <button
            onClick={() => setShowBackupCodeInput(true)}
            className="text-muted-foreground hover:text-foreground underline"
          >
            Use Backup Code
          </button>
        </div>

        {onCancel && (
          <div className="text-center pt-4 border-t border-border">
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
