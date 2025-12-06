'use client';

/**
 * Login & Security Client Component
 * Premium security settings with modern design
 */

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FaShieldAlt,
  FaKey,
  FaChevronRight,
  FaCheck,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaLock,
  FaFingerprint,
} from 'react-icons/fa';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MFAEnrollment } from '@/components/security/MFAEnrollment';
import { cn } from '@/lib/utils';
import type { AuthUser } from '@/app/actions/auth';

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
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export function LoginSecurityClient({ user, isAdmin }: LoginSecurityClientProps) {
  const [editingPassword, setEditingPassword] = useState(false);
  const [email, setEmail] = useState(user.email || '');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSendResetEmail = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await auth.resetPassword(email);
      if (resetError) {
        setError(resetError.message || 'Failed to send reset email');
      } else {
        setIsEmailSent(true);
        timerRef.current = setTimeout(() => {
          setIsEmailSent(false);
          setEditingPassword(false);
        }, 5000);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPasswordEdit = () => {
    setEditingPassword(false);
    setIsEmailSent(false);
    setError(null);
    setEmail(user.email || '');
  };

  const securityTips = [
    'Use a unique password that you don\'t use for other accounts',
    'Make your password at least 12 characters with letters, numbers, and symbols',
    'Never share your password with anyone, even FoodShare support',
    'Enable two-factor authentication for additional security',
  ];

  return (
    <div className="bg-gradient-to-b from-background via-muted/30 to-background pb-10">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-6 text-sm">
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
            <FaChevronRight className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-foreground font-medium">Login & security</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <FaShieldAlt className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Login & security</h1>
            </div>
            <p className="text-muted-foreground">
              Manage your password and keep your account secure
            </p>
          </motion.div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* Password Section */}
          <motion.div
            variants={itemVariants}
            className="group relative bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 hover:border-border hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <FaKey className="w-5 h-5 text-white" />
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
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
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
                        <FaCheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
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
                        <FaExclamationCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
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
                        disabled={isLoading || isEmailSent || !email}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isLoading ? (
                          'Sending...'
                        ) : (
                          <>
                            <FaCheck className="w-3 h-3 mr-1.5" />
                            Send reset link
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleCancelPasswordEdit}
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                      >
                        <FaTimes className="w-3 h-3 mr-1.5" />
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
          </motion.div>

          {/* Admin MFA Section */}
          {isAdmin && user.id && (
            <>
              <Separator className="my-6 bg-border/50" />

              <motion.div
                variants={itemVariants}
                className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                    <FaFingerprint className="w-5 h-5 text-white" />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 to-transparent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Admin Security
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Multi-factor authentication for administrator access
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
                  <div className="flex items-start gap-3">
                    <FaLock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Admin Access Protection:</strong> As an administrator, MFA adds
                      an extra layer of security to protect sensitive features and the CMS.
                    </p>
                  </div>
                </div>

                <MFAEnrollment profileId={user.id} />
              </motion.div>
            </>
          )}

          <Separator className="my-6 bg-border/50" />

          {/* Security Tips */}
          <motion.div
            variants={itemVariants}
            className="bg-muted/50 rounded-2xl border border-border/50 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <FaShieldAlt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                    <FaCheck className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">{tip}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

export default LoginSecurityClient;
