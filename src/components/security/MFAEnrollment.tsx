'use client';

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

import React, { useState } from "react";

import { MFAService, type MFAMethod } from "@/lib/security/mfa";
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { FaCheckCircle, FaDownload, FaEnvelope, FaExclamationCircle, FaMobileAlt, FaShieldAlt } from 'react-icons/fa';

interface MFAEnrollmentProps {
  profileId: string;
  onEnrolled?: () => void;
  onCancelled?: () => void;
}

type EnrollmentStep = "method_selection" | "phone_entry" | "verification" | "backup_codes";

export const MFAEnrollment: React.FC<MFAEnrollmentProps> = ({
  profileId,
  onEnrolled,
  onCancelled,
}) => {
  const [step, setStep] = useState<EnrollmentStep>("method_selection");
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>("email");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);

  // Handle method selection
  const handleMethodSelection = async (method: MFAMethod) => {
    setSelectedMethod(method);
    if (method === "sms") {
      setStep("phone_entry");
    } else {
      // For email, proceed directly to verification
      await sendVerificationCode("email");
    }
  };

  // Handle phone number submission
  const handlePhoneSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    await sendVerificationCode("sms");
  };

  // Send verification code
  const sendVerificationCode = async (method: "sms" | "email") => {
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
      setStep("verification");
    } catch (err) {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification code submission
  const handleVerificationSubmit = async () => {
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
        } else {
          setError(result.error || "Verification failed");
        }
        return;
      }

      // Verification successful, now enroll the user
      await completeEnrollment();
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Complete MFA enrollment
  const completeEnrollment = async () => {
    setIsLoading(true);

    try {
      const result = await MFAService.enrollMFA(
        profileId,
        selectedMethod,
        selectedMethod === "sms" ? phoneNumber : undefined
      );

      if (!result.success) {
        setError(result.error || "Failed to complete enrollment");
        return;
      }

      setBackupCodes(result.backup_codes || []);
      setStep("backup_codes");
    } catch (err) {
      setError("Failed to complete enrollment. Please try again.");
    } finally {
      setIsLoading(false);
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
        <FaShieldAlt className="w-16 h-16 mx-auto mb-4 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          "Enable Two-Factor Authentication"
        </h2>
        <p className="text-gray-600">
          "Choose your preferred verification method"
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Method */}
        <button
          onClick={() => handleMethodSelection("email")}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group text-left"
        >
          <FaEnvelope className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-bold text-gray-900 mb-2">
            "Email Verification"
          </h3>
          <p className="text-sm text-gray-600">
            "Receive verification codes via email"
          </p>
        </button>

        {/* SMS Method */}
        <button
          onClick={() => handleMethodSelection("sms")}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group text-left"
        >
          <FaMobileAlt className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-bold text-gray-900 mb-2">
            "SMS Verification"
          </h3>
          <p className="text-sm text-gray-600">
            "Receive verification codes via SMS"
          </p>
        </button>
      </div>

      {onCancelled && (
        <div className="text-center">
          <button onClick={onCancelled} className="text-gray-600 hover:text-gray-800 underline">
            "Cancel"
          </button>
        </div>
      )}
    </div>
  );

  // Render phone entry step
  const renderPhoneEntry = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FaMobileAlt className="w-16 h-16 mx-auto mb-4 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          "Enter Phone Number"
        </h2>
        <p className="text-gray-600">
          "We'll send a verification code to this number"
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <FaExclamationCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          "Phone Number"
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1234567890"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">
          "Include country code (e.g., +1 for US)"
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep("method_selection")}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          "Back"
        </button>
        <button
          onClick={handlePhoneSubmit}
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
              "Sending..."
            </>
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );

  // Render verification step
  const renderVerification = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FaShieldAlt className="w-16 h-16 mx-auto mb-4 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          "Enter Verification Code"
        </h2>
        <p className="text-gray-600">
          {selectedMethod === "email" ? (
            "Check your email for the 6-digit code"
          ) : (
            "Check your phone for the 6-digit code"
          )}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <FaExclamationCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          "Verification Code"
        </label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
          maxLength={6}
        />
        <p className="mt-1 text-xs text-gray-500 text-center">
          "Code expires in 5 minutes"
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => sendVerificationCode(selectedMethod as "sms" | "email")}
          disabled={isLoading}
          className="px-4 py-2 text-sm text-green-600 hover:text-green-700 underline"
        >
          "Resend Code"
        </button>
      </div>

      <button
        onClick={handleVerificationSubmit}
        disabled={isLoading || verificationCode.length !== 6}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
            "Verifying..."
          </>
        ) : (
          "Verify Code"
        )}
      </button>
    </div>
  );

  // Render backup codes step
  const renderBackupCodes = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FaCheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          "Save Your Backup Codes"
        </h2>
        <p className="text-gray-600">
          "Store these codes in a safe place. Each code can only be used once."
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          
            These backup codes allow you to access your account if you lose access to your phone or
            email. Keep them safe!
          
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="grid grid-cols-2 gap-3 font-mono text-sm">
          {backupCodes.map((code, index) => (
            <div key={index} className="bg-white p-3 rounded border border-gray-200 text-center">
              {code}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={downloadBackupCodes}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <FaDownload className="w-4 h-4" />
        "Download Backup Codes"
      </button>

      <button
        onClick={onEnrolled}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        "Complete Setup"
      </button>

      <p className="text-xs text-gray-500 text-center">
        "Make sure to download or write down these codes before continuing"
      </p>
    </div>
  );

  // Render current step
  const renderStep = () => {
    switch (step) {
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

  return <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">{renderStep()}</div>;
};
