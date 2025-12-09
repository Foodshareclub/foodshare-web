"use client";

/**
 * Forgot Password Page
 * Uses Server Action for password reset with i18n support
 */

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { resetPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function IconCircle({
  icon: Icon,
  variant = "success",
}: {
  icon: React.ComponentType<{ className?: string }>;
  variant?: "success" | "primary";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center w-16 h-16 rounded-full mb-6",
        variant === "success" && "bg-emerald-100 dark:bg-emerald-900/30",
        variant === "primary" && "bg-primary/10"
      )}
    >
      <Icon
        className={cn(
          "w-7 h-7",
          variant === "success" && "text-emerald-600 dark:text-emerald-400",
          variant === "primary" && "text-primary"
        )}
      />
    </div>
  );
}

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await resetPassword(email);
      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.error || t("ForgotPassword.error_generic"));
      }
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background relative overflow-hidden">
      {/* Background Pattern - using CSS variable for brand color */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 bg-background/95 border-b border-border z-10 backdrop-blur-[10px]">
        <div className="container mx-auto max-w-7xl py-4 px-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <p className="text-2xl font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity duration-200">
                FoodShare
              </p>
            </Link>
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" />
              {t("ForgotPassword.back_to_login")}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-[480px] py-8 md:py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Card */}
          <div className="bg-card rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 md:p-8 border border-border">
            {isSuccess ? (
              <SuccessState
                email={email}
                onReset={() => {
                  setIsSuccess(false);
                  setEmail("");
                }}
              />
            ) : (
              <FormState
                email={email}
                setEmail={setEmail}
                error={error}
                isPending={isPending}
                onSubmit={handleSubmit}
              />
            )}
          </div>

          {/* Footer */}
          <p className="text-[13px] text-muted-foreground text-center mt-6 leading-relaxed">
            {t("ForgotPassword.remember_password")}{" "}
            <Link
              href="/auth/login"
              className="text-foreground font-semibold underline hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              {t("login")}
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function SuccessState({ email, onReset }: { email: string; onReset: () => void }) {
  const t = useTranslations();

  return (
    <div className="text-center">
      <IconCircle icon={CheckCircle} variant="success" />
      <h1 className="text-[28px] font-bold mb-3 text-foreground">
        {t("ForgotPassword.check_email_title")}
      </h1>
      <p className="text-base text-muted-foreground leading-relaxed mb-6">
        {t("ForgotPassword.check_email_description")}{" "}
        <span className="font-semibold text-foreground">{email}</span>
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        {t("ForgotPassword.didnt_receive")}{" "}
        <button
          onClick={onReset}
          className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
        >
          {t("try_again")}
        </button>
      </p>
      <Link href="/auth/login">
        <Button className="w-full h-14 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white font-semibold text-base rounded-xl hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800">
          {t("ForgotPassword.return_to_login")}
        </Button>
      </Link>
    </div>
  );
}

function FormState({
  email,
  setEmail,
  error,
  isPending,
  onSubmit,
}: {
  email: string;
  setEmail: (email: string) => void;
  error: string | null;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const t = useTranslations();

  return (
    <>
      {/* Header */}
      <div className="mb-8 text-center">
        <IconCircle icon={Mail} variant="success" />
        <h1 className="text-[28px] font-bold mb-3 text-foreground">{t("ForgotPassword.title")}</h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          {t("ForgotPassword.description")}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
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
              </div>
              <p id="email-error" className="text-sm text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={onSubmit}>
        <div className="flex flex-col gap-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-2 text-foreground/80">
              {t("email_address_1")}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={t("youexamplecom")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              aria-describedby={error ? "email-error" : undefined}
              className="h-12 rounded-xl border border-border bg-background hover:border-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isPending || !email}
            className="w-full h-14 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white font-semibold text-base rounded-xl hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,185,129,0.35)] active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("sending")}
              </span>
            ) : (
              t("ForgotPassword.send_reset_link")
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
          <ArrowLeft className="w-3 h-3" />
          {t("ForgotPassword.back_to_login")}
        </Link>
      </div>
    </>
  );
}
