'use client';

/**
 * Forgot Password Page - Next.js App Router version
 * Allows users to request a password reset email
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';

export default function ForgotPasswordPage() {
  const { recoverPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await recoverPassword(email);
      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.error || 'Failed to send reset email. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute top-0 left-0 right-0 bottom-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #FF2D55 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Header */}
      <div className="sticky top-0 bg-background/95 border-b border-border z-10 backdrop-blur-[10px]">
        <div className="container mx-auto max-w-7xl py-4 px-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <p className="text-2xl font-bold text-[#FF2D55] cursor-pointer hover:opacity-80 transition-opacity duration-200">
                FoodShare
              </p>
            </Link>
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <FaArrowLeft className="w-3 h-3" />
              Back to login
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
          <div className="bg-card rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 md:p-8 border border-border">
            {isSuccess ? (
              /* Success State */
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF2D55]/10 rounded-full mb-6">
                  <FaCheckCircle className="w-8 h-8 text-[#FF2D55]" />
                </div>
                <h1 className="text-[28px] font-bold mb-3 text-foreground">
                  Check your email
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed mb-6">
                  We&apos;ve sent a password reset link to{' '}
                  <span className="font-semibold text-foreground">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  Didn&apos;t receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      setEmail('');
                    }}
                    className="text-[#FF2D55] font-semibold hover:underline"
                  >
                    try again
                  </button>
                </p>
                <Link href="/auth/login">
                  <Button className="w-full h-14 bg-gradient-to-r from-[#FF2D55] via-[#E6284D] to-[#CC2345] text-white font-semibold text-base rounded-xl hover:from-[#E6284D] hover:via-[#CC2345] hover:to-[#B31F3D]">
                    Return to login
                  </Button>
                </Link>
              </div>
            ) : (
              /* Form State */
              <>
                {/* Header */}
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF2D55]/10 rounded-full mb-6">
                    <FaEnvelope className="w-7 h-7 text-[#FF2D55]" />
                  </div>
                  <h1 className="text-[28px] font-bold mb-3 text-foreground">
                    Forgot your password?
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    No worries! Enter your email address and we&apos;ll send you a link to reset your password.
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
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-foreground/80">
                        Email address
                      </label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        className="h-12 rounded-xl border border-border bg-background hover:border-muted-foreground focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55]"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isLoading || !email}
                      className="w-full h-14 bg-gradient-to-r from-[#FF2D55] via-[#E6284D] to-[#CC2345] text-white font-semibold text-base rounded-xl hover:from-[#E6284D] hover:via-[#CC2345] hover:to-[#B31F3D] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,85,0.35)] active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        'Send reset link'
                      )}
                    </Button>
                  </div>
                </form>

                {/* Back to Login */}
                <div className="mt-8 text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
                  >
                    <FaArrowLeft className="w-3 h-3" />
                    Back to login
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <p className="text-[13px] text-muted-foreground text-center mt-6 leading-relaxed">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-foreground font-semibold underline hover:text-[#FF2D55]">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
