"use client";

/**
 * Login Page - Next.js App Router version
 * Beautiful full-page login experience with social OAuth
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// Inline brand SVGs (avoids react-icons dependency)
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithPassword, loginWithProvider, register, authError, clearError, isAuth } =
    useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get redirect URL from query params
  const from = searchParams.get("from") || "/";

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuth) {
      router.replace(from);
    }
  }, [isAuth, router, from]);

  useEffect(() => {
    clearError();
  }, [mode, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    try {
      if (mode === "login") {
        const result = await loginWithPassword(email, password);
        if (result.success) {
          router.replace(from);
        }
      } else {
        const result = await register({
          email,
          password,
          firstName,
          lastName,
        });
        if (result.success) {
          setMode("login");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook" | "apple") => {
    clearError();
    // Store return URL for after OAuth callback
    if (typeof window !== "undefined") {
      sessionStorage.setItem("auth_return_url", from);
    }
    await loginWithProvider(provider);
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    clearError();
  };

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute top-0 left-0 right-0 bottom-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #FF2D55 1px, transparent 1px)",
          backgroundSize: "40px 40px",
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
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <span
                className="font-semibold text-foreground cursor-pointer underline hover:text-[#FF2D55]"
                onClick={toggleMode}
              >
                {mode === "login" ? "Sign up" : "Log in"}
              </span>
            </p>
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
            {/* Welcome Message */}
            <div className="mb-8 text-center">
              <h1 className="text-[32px] font-bold mb-3 text-foreground">
                {mode === "login" ? "Welcome back" : "Join FoodShare"}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                {mode === "login"
                  ? "Log in to continue sharing and discovering food in your community"
                  : "Create an account to start sharing food and reducing waste together"}
              </p>
            </div>

            {/* Error Alert */}
            {authError && (
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
                    <p className="text-sm text-red-800">{authError}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-5">
                {/* Name Fields (Signup only) */}
                {mode === "signup" && (
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-2 text-foreground/80">
                        First name
                      </label>
                      <Input
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="h-12 rounded-xl border border-border bg-background hover:border-muted-foreground focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-2 text-foreground/80">
                        Last name
                      </label>
                      <Input
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="h-12 rounded-xl border border-border bg-background hover:border-muted-foreground focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55]"
                      />
                    </div>
                  </div>
                )}

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
                    className="h-12 rounded-xl border border-border bg-background hover:border-muted-foreground focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55]"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-foreground/80">Password</label>
                    {mode === "login" && (
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm text-[#FF2D55] font-semibold hover:underline"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className="h-12 rounded-xl border border-border bg-background pr-12 hover:border-muted-foreground focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-gradient-to-r from-[#FF2D55] via-[#E6284D] to-[#CC2345] text-white font-semibold text-base rounded-xl hover:from-[#E6284D] hover:via-[#CC2345] hover:to-[#B31F3D] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,85,0.35)] active:translate-y-0 transition-all"
                >
                  {isLoading
                    ? mode === "login"
                      ? "Logging in..."
                      : "Creating account..."
                    : mode === "login"
                      ? "Log in"
                      : "Create account"}
                </Button>
              </div>
            </form>

            {/* Divider */}
            <div className="flex items-center my-8">
              <Separator className="flex-1" />
              <span className="px-4 text-sm text-muted-foreground font-medium">
                or continue with
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Social Login Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                onClick={() => handleSocialLogin("google")}
                variant="outline"
                className="w-full h-14 border-border rounded-xl font-medium text-[15px] bg-background hover:border-foreground hover:bg-muted/50 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all"
              >
                <span className="mr-3">
                  <GoogleIcon />
                </span>
                Google
              </Button>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => handleSocialLogin("facebook")}
                  variant="outline"
                  className="flex-1 h-14 border-border rounded-xl font-medium text-[15px] bg-background hover:border-foreground hover:bg-muted/50 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all"
                >
                  <span className="mr-2">
                    <FacebookIcon />
                  </span>
                  Facebook
                </Button>

                <Button
                  type="button"
                  onClick={() => handleSocialLogin("apple")}
                  variant="outline"
                  className="flex-1 h-14 border-border rounded-xl font-medium text-[15px] bg-background hover:border-foreground hover:bg-muted/50 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all"
                >
                  <span className="mr-2">
                    <AppleIcon />
                  </span>
                  Apple
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-[13px] text-muted-foreground text-center mt-6 leading-relaxed">
            By continuing, you agree to FoodShare&apos;s{" "}
            <Link
              href="/terms"
              className="text-foreground font-semibold underline hover:text-[#FF2D55]"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-foreground font-semibold underline hover:text-[#FF2D55]"
            >
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
