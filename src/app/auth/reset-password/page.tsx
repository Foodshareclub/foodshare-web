'use client';

/**
 * Reset Password Page - Next.js App Router version
 * Allows users to set a new password after clicking the reset link
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword, isAuthenticated } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Check if user has a valid recovery session
  useEffect(() => {
    // The user should arrive here via the reset link which sets up the session
    // If they're authenticated (session exists from reset link), they can reset
    const checkSession = async () => {
      // Give a moment for the session to be established from the URL hash
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsValidSession(isAuthenticated);
    };
    checkSession();
  }, [isAuthenticated]);

  const validatePassword = (): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await updatePassword(password);
      if (result.success) {
        setIsSuccess(true);
        // Redirect to home after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setError(result.error || 'Failed to reset password. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength: 2, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength: 3, label: 'Good', color: 'bg-emerald-400' };
    return { strength: 4, label: 'Strong', color: 'bg-emerald-600' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute top-0 left-0 right-0 bottom-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #E61E4D 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Header */}
      <div className="sticky top-0 bg-white/95 border-b border-gray-200 z-10 backdrop-blur-[10px]">
        <div className="container mx-auto max-w-7xl py-4 px-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <p className="text-2xl font-bold text-emerald-600 cursor-pointer hover:opacity-80 transition-opacity duration-200">
                FoodShare
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-[480px] py-8 md:py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 md:p-8 border border-gray-200">
            {/* Loading state while checking session */}
            {isValidSession === null && (
              <div className="text-center py-8">
                <AiOutlineLoading3Quarters className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
                <p className="text-gray-600">Verifying your reset link...</p>
              </div>
            )}

            {/* Invalid/Expired Session */}
            {isValidSession === false && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                  <FaExclamationTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-[28px] font-bold mb-3 text-gray-900">
                  Link expired or invalid
                </h1>
                <p className="text-base text-gray-600 leading-relaxed mb-6">
                  This password reset link has expired or is invalid. Please request a new one.
                </p>
                <Link href="/auth/forgot-password">
                  <Button className="w-full h-14 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white font-semibold text-base rounded-xl hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800">
                    Request new reset link
                  </Button>
                </Link>
              </div>
            )}

            {/* Success State */}
            {isSuccess && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-6">
                  <FaCheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h1 className="text-[28px] font-bold mb-3 text-gray-900">
                  Password updated!
                </h1>
                <p className="text-base text-gray-600 leading-relaxed mb-6">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Redirecting you to the homepage...
                </p>
                <Link href="/">
                  <Button className="w-full h-14 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white font-semibold text-base rounded-xl hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800">
                    Go to homepage
                  </Button>
                </Link>
              </div>
            )}

            {/* Form State */}
            {isValidSession === true && !isSuccess && (
              <>
                {/* Header */}
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-6">
                    <FaLock className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h1 className="text-[28px] font-bold mb-3 text-gray-900">
                    Set new password
                  </h1>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Create a strong password that you don&apos;t use elsewhere.
                  </p>
                </div>

                {/* Error Alert */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                  >
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-5">
                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        New password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoFocus
                          className="h-12 rounded-xl border border-gray-300 bg-white pr-12 hover:border-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      {password && (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-1">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className={`h-1 flex-1 rounded-full ${
                                  level <= passwordStrength.strength
                                    ? passwordStrength.color
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <p className={`text-xs ${
                            passwordStrength.strength <= 1 ? 'text-red-600' :
                            passwordStrength.strength <= 2 ? 'text-yellow-600' :
                            'text-emerald-600'
                          }`}>
                            {passwordStrength.label}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Confirm new password
                      </label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="h-12 rounded-xl border border-gray-300 bg-white pr-12 hover:border-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <p className="text-xs text-emerald-600 mt-1">Passwords match</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isLoading || !password || !confirmPassword}
                      className="w-full h-14 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white font-semibold text-base rounded-xl hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,185,129,0.35)] active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin" />
                          Updating...
                        </span>
                      ) : (
                        'Reset password'
                      )}
                    </Button>
                  </div>
                </form>

                {/* Password Requirements */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className={`flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-600' : ''}`}>
                      {password.length >= 8 ? '✓' : '•'} At least 8 characters
                    </li>
                    <li className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-emerald-600' : ''}`}>
                      {/[A-Z]/.test(password) ? '✓' : '•'} One uppercase letter
                    </li>
                    <li className={`flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-emerald-600' : ''}`}>
                      {/[0-9]/.test(password) ? '✓' : '•'} One number
                    </li>
                    <li className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600' : ''}`}>
                      {/[^A-Za-z0-9]/.test(password) ? '✓' : '•'} One special character
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
