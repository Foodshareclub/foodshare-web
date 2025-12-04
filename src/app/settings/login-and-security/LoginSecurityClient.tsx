'use client';

/**
 * Login & Security Client Component
 * Handles password reset, MFA, and security settings
 */

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MFAEnrollment } from '@/components/security/MFAEnrollment';
import { FaShieldAlt } from 'react-icons/fa';
import type { AuthUser } from '@/app/actions/auth';

interface LoginSecurityClientProps {
  user: AuthUser;
  isAdmin: boolean;
}

export function LoginSecurityClient({ user, isAdmin }: LoginSecurityClientProps) {
  const [editingPassword, setEditingPassword] = useState(false);
  const [email, setEmail] = useState(user.email || '');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
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

        // Auto-hide success message after 5 seconds
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8">
          <Link
            href="/settings"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Account settings
          </Link>
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Login & security
          </span>
        </nav>

        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Login & security
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Update your password and secure your account
          </p>
        </motion.div>

        {/* Change Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Change password
              </h2>

              {editingPassword ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Enter your email and you will receive a link to change your password
                  </p>

                  {/* Success Message */}
                  {isEmailSent && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5 text-green-600 dark:text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            Password reset email sent!
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Please check your email for the reset link.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5 text-red-600 dark:text-red-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <Label htmlFor="email">Email address</Label>
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
                    >
                      {isLoading ? 'Sending...' : 'Send reset link'}
                    </Button>
                    <Button
                      onClick={handleCancelPasswordEdit}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  Keep your account secure by using a strong password
                </p>
              )}
            </div>
            {!editingPassword && (
              <Button
                onClick={() => setEditingPassword(true)}
                variant="ghost"
                size="sm"
              >
                Edit
              </Button>
            )}
          </div>
        </motion.div>

        {/* Admin MFA Section - Only visible to admins */}
        {isAdmin && user.id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <FaShieldAlt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Admin Security
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Multi-factor authentication for administrator access
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Admin Access Protection:</strong> As an administrator, you have access to
                sensitive features. Multi-factor authentication (MFA) adds an extra layer of
                security to protect your admin account and the CMS.
              </p>
            </div>

            <MFAEnrollment profileId={user.id} />
          </motion.div>
        )}

        {/* Security Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-6 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Security tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Use a unique password that you do not use for other accounts</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Make your password at least 12 characters long with a mix of letters, numbers, and symbols</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Never share your password with anyone, even FoodShare support staff</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Enable two-factor authentication for additional security</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

export default LoginSecurityClient;
