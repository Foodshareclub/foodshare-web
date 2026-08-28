"use client";

/**
 * MFA Enrollment Component
 * Allows users to enroll in multi-factor authentication
 *
 * Features:
 * - Phone/SMS and Email verification options
 * - Step-by-step enrollment flow
 * - Backup code generation and display
 * - Security best practices
 */

import React, { useState, useActionState, useOptimistic } from "react";
import { useFormStatus } from "react-dom";

import {
  Loader2,
  CheckCircle,
  Download,
  Mail,
  AlertCircle,
  Smartphone,
  Shield,
} from "lucide-react";
import { MFAService, type MFAMethod } from "@/lib/security/mfa";

interface MFAEnrollmentProps {
  profileId: string;
  onEnrolled?: () => void;
  onCancelled?: () => void;
}

type EnrollmentStep = "method_selection" | "phone_entry" | "verification" | "backup_codes";

// React 19: Dedicated Submit Button utilizing useFormStatus
function SubmitButton({ pendingText, defaultText }: { pendingText: string, defaultText: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
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

export const MFAEnrollment: React.FC<MFAEnrollmentProps> = ({
  profileId,
  onEnrolled,
  onCancelled,
}) => {
  const [step, setStep] = useState<EnrollmentStep>("method_selection");
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>("email");
  const [challengeId, setChallengeId] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [_attemptsRemaining, setAttemptsRemaining] = useState(5);

  // React 19: Optimistic UI state for step progression
  const [optimisticStep, setOptimisticStep] = useOptimistic(
    step,
    (_state, newStep: EnrollmentStep) => newStep
  );

  // React 19: Action State for sending verification code
  const [sendState, sendVerificationAction] = useActionState<ActionState, FormData>(
    async (_prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const method = (formData.get("method") as "sms" | "email") || "sms";
      const phone = formData.get("phone") as string;
      
      if (method === "sms" && (!phone || phone.length < 10)) {
        return { error: "Please enter a valid phone number" };
      }

      try {
        const result = await MFAService.createChallenge(profileId, method);
        if (!result.success) {
          if (result.error === "rate_limit_exceeded") {
            return { error: `Too many attempts. Try again after ${result.locked_until}` };
          }
          return { error: result.error || "Failed to send verification code" };
        }
        setChallengeId(result.challenge_id || "");
        setStep("verification");
        return { success: true };
      } catch {
        return { error: "Failed to send verification code. Please try again." };
      }
    },
    {}
  );

  // React 19: Action State for verifying code and enrolling
  const [verifyState, verifyCodeAction] = useActionState<ActionState, FormData>(
    async (_prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const code = formData.get("code") as string;
      const phone = formData.get("phone") as string;
      
      if (!code || code.length !== 6) {
        return { error: "Please enter a valid 6-digit code" };
      }

      try {
        const verifyResult = await MFAService.verifyChallenge(challengeId, code, profileId);
        if (!verifyResult.success) {
          if (verifyResult.attempts_remaining !== undefined) {
            setAttemptsRemaining(verifyResult.attempts_remaining);
            return { error: `Invalid code. ${verifyResult.attempts_remaining} attempts remaining.` };
          }
          return { error: verifyResult.error || "Verification failed" };
        }

        // Verification successful, now enroll the user
        const enrollResult = await MFAService.enrollMFA(
          profileId,
          selectedMethod,
          selectedMethod === "sms" ? phone : undefined
        );

        if (!enrollResult.success) {
          return { error: enrollResult.error || "Failed to complete enrollment" };
        }

        setBackupCodes(enrollResult.backup_codes || []);
        setStep("backup_codes");
        return { success: true };
      } catch {
        return { error: "Verification failed. Please try again." };
      }
    },
    {}
  );

  // Handle method selection
  const handleMethodSelection = (method: MFAMethod) => {
    setSelectedMethod(method);
    if (method === "sms") {
      setStep("phone_entry");
    } else {
      setOptimisticStep("verification");
      const formData = new FormData();
      formData.append("method", "email");
      React.startTransition(() => {
        sendVerificationAction(formData);
      });
    }
  };

  // Download backup codes as text file
  const downloadBackupCodes = () => {
    const text = backupCodes.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "foodshare-mfa-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Render method selection step
  const renderMethodSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          &quot;Enable Two-Factor Authentication&quot;
        </h2>
        <p className="text-muted-foreground">
          &quot;Choose your preferred verification method&quot;
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Method */}
        <button
          onClick={() => handleMethodSelection("email")}
          className="p-6 border-2 border-border rounded-lg hover:border-green-500 hover:bg-green-500/10 transition-all group text-left"
        >
          <Mail className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
          <h3 className="font-bold text-foreground mb-2">&quot;Email Verification&quot;</h3>
          <p className="text-sm text-muted-foreground">
            &quot;Receive verification codes via email&quot;
          </p>
        </button>

        {/* SMS Method */}
        <button
          onClick={() => handleMethodSelection("sms")}
          className="p-6 border-2 border-border rounded-lg hover:border-green-500 hover:bg-green-500/10 transition-all group text-left"
        >
          <Smartphone className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
          <h3 className="font-bold text-foreground mb-2">&quot;SMS Verification&quot;</h3>
          <p className="text-sm text-muted-foreground">
            &quot;Receive verification codes via SMS&quot;
          </p>
        </button>
      </div>

      {onCancelled && (
        <div className="text-center">
          <button
            onClick={onCancelled}
            className="text-muted-foreground hover:text-foreground underline"
          >
            &quot;Cancel&quot;
          </button>
        </div>
      )}
    </div>
  );

  // Render phone entry step
  const renderPhoneEntry = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Smartphone className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
        <h2 className="text-2xl font-bold text-foreground mb-2">&quot;Enter Phone Number&quot;</h2>
        <p className="text-muted-foreground">
          &quot;We&apos;ll send a verification code to this number&quot;
        </p>
      </div>

      {sendState?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{sendState.error}</p>
        </div>
      )}

      <form action={(formData) => {
        setOptimisticStep("verification");
        sendVerificationAction(formData);
      }}>
        <input type="hidden" name="method" value="sms" />
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            &quot;Phone Number&quot;
          </label>
          <input
            type="tel"
            name="phone"
            placeholder="+1234567890"
            required
            className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            &quot;Include country code (e.g., +1 for US)&quot;
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep("method_selection")}
            className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            &quot;Back&quot;
          </button>
          <div className="flex-1">
            <SubmitButton pendingText="Sending..." defaultText="Continue" />
          </div>
        </div>
      </form>
    </div>
  );

  // Render verification step
  const renderVerification = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          &quot;Enter Verification Code&quot;
        </h2>
        <p className="text-muted-foreground">
          {selectedMethod === "email"
            ? "Check your email for the 6-digit code"
            : "Check your phone for the 6-digit code"}
        </p>
      </div>

      {verifyState?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{verifyState.error}</p>
        </div>
      )}

      <form action={(formData) => {
        setOptimisticStep("backup_codes");
        verifyCodeAction(formData);
      }}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            &quot;Verification Code&quot;
          </label>
          <input
            type="text"
            name="code"
            placeholder="000000"
            required
            className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest font-mono"
            maxLength={6}
          />
          <p className="mt-1 text-xs text-muted-foreground text-center">
            &quot;Code expires in 5 minutes&quot;
          </p>
        </div>

        <div className="flex gap-3 mb-4">
          <input type="hidden" name="method" value={selectedMethod} />
          <button
            type="submit"
            formAction={sendVerificationAction}
            className="px-4 py-2 text-sm text-primary hover:text-primary/80 underline"
          >
            &quot;Resend Code&quot;
          </button>
        </div>

        <SubmitButton pendingText="Verifying..." defaultText="Verify Code" />
      </form>
    </div>
  );

  // Render backup codes step
  const renderBackupCodes = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          &quot;Save Your Backup Codes&quot;
        </h2>
        <p className="text-muted-foreground">
          &quot;Store these codes in a safe place. Each code can only be used once.&quot;
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          These backup codes allow you to access your account if you lose access to your phone or
          email. Keep them safe!
        </p>
      </div>

      <div className="bg-muted rounded-lg p-6 border border-border">
        <div className="grid grid-cols-2 gap-3 font-mono text-sm">
          {backupCodes.map((code, index) => (
            <div key={index} className="bg-background p-3 rounded border border-border text-center">
              {code}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={downloadBackupCodes}
        className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        &quot;Download Backup Codes&quot;
      </button>

      <button
        onClick={onEnrolled}
        className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        &quot;Complete Setup&quot;
      </button>

      <p className="text-xs text-muted-foreground text-center">
        &quot;Make sure to download or write down these codes before continuing&quot;
      </p>
    </div>
  );

  // Render current step
  const renderStep = () => {
    switch (optimisticStep) {
      case "method_selection":
        return renderMethodSelection();
      case "phone_entry":
        return renderPhoneEntry();
      case "verification":
        return renderVerification();
      case "backup_codes":
        return renderBackupCodes();
      default:
        return null;
    }
  };

  return <div className="max-w-2xl mx-auto p-6 bg-card rounded-lg shadow-lg">{renderStep()}</div>;
};
