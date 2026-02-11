"use client";

/**
 * Login & Security Client Component
 * Premium security settings with modern design
 */

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Key,
  ChevronLeft,
  Check,
  X,
  CheckCircle,
  AlertCircle,
  Lock,
  Fingerprint,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Glass } from "@/components/ui/glass";
import { MFAEnrollment } from "@/components/security/MFAEnrollment";
import { cn as _cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/data/auth";

interface LoginSecurityClientProps {
  user: AuthUser;
  isAdmin: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export function LoginSecurityClient({ user, isAdmin }: LoginSecurityClientProps) {
  const [editingPassword, setEditingPassword] = useState(false);
  const [email, setEmail] = useState(user.email || "");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSendResetEmail = () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const { error: resetError } = await auth.resetPassword(email);
        if (resetError) {
          setError(resetError.message || "Failed to send reset email");
        } else {
          setIsEmailSent(true);
          timerRef.current = setTimeout(() => {
            setIsEmailSent(false);
            setEditingPassword(false);
          }, 5000);
        }
      } catch {
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const handleCancelPasswordEdit = () => {
    setEditingPassword(false);
    setIsEmailSent(false);
    setError(null);
    setEmail(user.email || "");
  };

  const securityTips = [
    "Use a unique password that you don't use for other accounts",
    "Make your password at least 12 characters with letters, numbers, and symbols",
    "Never share your password with anyone, even FoodShare support",
    "Enable two-factor authentication for additional security",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background pb-10">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-teal-500/8 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 lg:py-10">
        {/* Back navigation */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Settings
          </Link>
        </motion.div>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Login & security</h1>
              <p className="text-sm text-muted-foreground">
                Manage your password and account security
              </p>
            </div>
          </div>
        </motion.header>

        {/* Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* Password Section */}
          <motion.div variants={itemVariants}>
            <Glass
              variant="subtle"
              hover
              className="group relative p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg transition-transform duration-300 group-hover:scale-105">
                  <Key className="w-5 h-5 text-white" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 to-transparent" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground">Password</h3>
                    {!editingPassword && (
                      <Button
                        onClick={() => setEditingPassword(true)}
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary/80 hover:bg-primary/10"
                      >
                        Update
                      </Button>
                    )}
                  </div>

                  {editingPassword ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        We&apos;ll send a password reset link to your email address
                      </p>

                      {/* Success Message */}
                      {isEmailSent && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                        >
                          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                              Reset link sent!
                            </p>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                              Check your email for the password reset link.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Error Message */}
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                        >
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                        </motion.div>
                      )}

                      <div>
                        <Label htmlFor="email" className="text-xs text-muted-foreground">
                          Email address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="mt-1"
                          disabled={isEmailSent}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleSendResetEmail}
                          disabled={isPending || isEmailSent || !email}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {isPending ? (
                            "Sending..."
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1.5" />
                              Send reset link
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleCancelPasswordEdit}
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                        >
                          <X className="w-3 h-3 mr-1.5" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Keep your account secure with a strong password
                    </p>
                  )}
                </div>
              </div>
            </Glass>
          </motion.div>

          {/* Admin MFA Section */}
          {isAdmin && user.id && (
            <>
              <Separator className="my-6 bg-border/50" />

              <motion.div variants={itemVariants}>
                <Glass variant="subtle" className="p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                      <Fingerprint className="w-5 h-5 text-white" />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 to-transparent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Admin Security</h3>
                      <p className="text-sm text-muted-foreground">
                        Multi-factor authentication for administrator access
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
                    <div className="flex items-start gap-3">
                      <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Admin Access Protection:</strong> As an administrator, MFA adds an
                        extra layer of security to protect sensitive features and the CMS.
                      </p>
                    </div>
                  </div>

                  <MFAEnrollment profileId={user.id} />
                </Glass>
              </motion.div>
            </>
          )}

          <Separator className="my-6 bg-border/50" />

          {/* Security Tips */}
          <motion.div variants={itemVariants}>
            <Glass variant="subtle" className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Security tips</h3>
              </div>

              <ul className="space-y-3">
                {securityTips.map((tip, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mt-0.5">
                      <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm text-muted-foreground">{tip}</span>
                  </motion.li>
                ))}
              </ul>
            </Glass>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default LoginSecurityClient;
