"use client";

/**
 * Login Page - Next.js App Router version
 * Beautiful full-page login experience with social OAuth
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff } from "lucide-react";
import { FaGoogle, FaFacebook, FaApple } from "react-icons/fa";

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
                <FaGoogle className="w-5 h-5 mr-3 text-red-500" />
                Google
              </Button>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => handleSocialLogin("facebook")}
                  variant="outline"
                  className="flex-1 h-14 border-border rounded-xl font-medium text-[15px] bg-background hover:border-foreground hover:bg-muted/50 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all"
                >
                  <FaFacebook className="w-5 h-5 mr-2 text-blue-600" />
                  Facebook
                </Button>

                <Button
                  type="button"
                  onClick={() => handleSocialLogin("apple")}
                  variant="outline"
                  className="flex-1 h-14 border-border rounded-xl font-medium text-[15px] bg-background hover:border-foreground hover:bg-muted/50 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all"
                >
                  <FaApple className="w-5 h-5 mr-2" />
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
