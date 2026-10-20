"use client";

/**
 * Set a new password, from an emailed link.
 *
 * A client component for the form state; the metadata lives one file up in
 * `page.tsx`, which is a server component.
 *
 * Three things changed in Phase 26, and none of them is the translation:
 *
 * 1. **The session check is no longer a timer.** It was
 *    `await new Promise(r => setTimeout(r, 500)); setIsValidSession(isAuthenticated)`
 *    — a fixed 500 ms wait, decided once, from a value captured in that render's
 *    closure. A recovery session arriving at 600 ms produced "Link expired or
 *    invalid" for a link that worked, and because the effect's only dependency
 *    never changed again there was no second read. It is `useRecoverySession()`
 *    now: decide on evidence, and let a late arrival take the verdict back.
 * 2. **There is one password scorer.** This file had its own, scoring five
 *    properties and calling the same password "Fair" that the sign-in modal called
 *    "Very Strong". `scorePassword()` counts the four rules this page prints
 *    beneath the meter, so the two cannot disagree.
 * 3. **The error region announces itself.** There was no `role="alert"` and no
 *    `aria-live`, so an error appeared on screen and nothing said so.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useRecoverySession } from "@/hooks/useRecoverySession";
import { PASSWORD_RULES, scorePassword } from "@/lib/password-strength";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState, useTransition } from "react";

/** How long the success state waits before leaving for the homepage. */
const REDIRECT_AFTER_MS = 3000;

export function ResetPasswordForm() {
  const t = useTranslations("AuthFlow");
  const router = useRouter();
  const { updatePassword, isLoading, isAuthenticated } = useAuth();
  const session = useRecoverySession({ isLoading, isAuthenticated });

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const strength = scorePassword(password);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const matches = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.acceptable) {
      setError(t("errors.weakPassword"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("reset.passwordsDoNotMatch"));
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const result = await updatePassword(password);
        if (result.success) {
          setIsSuccess(true);
          setTimeout(() => router.push("/"), REDIRECT_AFTER_MS);
        } else {
          setError(t(`errors.${result.error ?? "passwordUpdateFailed"}`));
        }
      } catch {
        setError(t("errors.unknown"));
      }
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background relative overflow-hidden">
      <div
        className="absolute top-0 inset-x-0 bottom-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #FF2D55 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="sticky top-0 bg-background/95 border-b border-border z-10 backdrop-blur-[10px]">
        <div className="container mx-auto max-w-7xl py-4 px-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <p className="text-2xl font-bold text-[#FF2D55] cursor-pointer hover:opacity-80 transition-opacity duration-200">
                FoodShare
              </p>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-[480px] py-8 md:py-16 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="bg-card rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 md:p-8 border border-border">
            {session === "checking" && (
              <div className="text-center py-8" role="status" aria-live="polite">
                <Loader2 className="w-12 h-12 animate-spin text-[#FF2D55] mx-auto mb-4" />
                <p className="text-muted-foreground">{t("reset.verifyingLink")}</p>
              </div>
            )}

            {session === "expired" && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-[28px] font-bold mb-3 text-foreground">{t("reset.expiredTitle")}</h1>
                <p className="text-base text-muted-foreground leading-relaxed mb-6">{t("reset.expiredBody")}</p>
                <Link href="/auth/forgot-password" className="block">
                  <Button className="w-full h-14 bg-gradient-to-r from-[#FF2D55] via-[#E6284D] to-[#CC2345] text-white font-semibold text-base rounded-xl hover:from-[#E6284D] hover:via-[#CC2345] hover:to-[#B31F3D]">
                    {t("reset.requestNewLink")}
                  </Button>
                </Link>
              </div>
            )}

            {isSuccess && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF2D55]/10 rounded-full mb-6">
                  <CheckCircle className="w-8 h-8 text-[#FF2D55]" />
                </div>
                <h1 className="text-[28px] font-bold mb-3 text-foreground">{t("reset.updatedTitle")}</h1>
                <p className="text-base text-muted-foreground leading-relaxed mb-6">{t("reset.updatedBody")}</p>
                {/* Announced, because the redirect below is not. */}
                <p className="text-sm text-muted-foreground mb-6" role="status" aria-live="polite">
                  {t("reset.redirectingHome")}
                </p>
                <Link href="/" className="block">
                  <Button className="w-full h-14 bg-gradient-to-r from-[#FF2D55] via-[#E6284D] to-[#CC2345] text-white font-semibold text-base rounded-xl hover:from-[#E6284D] hover:via-[#CC2345] hover:to-[#B31F3D]">
                    {t("reset.goToHome")}
                  </Button>
                </Link>
              </div>
            )}

            {session === "valid" && !isSuccess && (
              <>
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF2D55]/10 rounded-full mb-6">
                    <Lock className="w-7 h-7 text-[#FF2D55]" />
                  </div>
                  <h1 className="text-[28px] font-bold mb-3 text-foreground">{t("reset.formTitle")}</h1>
                  <p className="text-base text-muted-foreground leading-relaxed">{t("reset.formBody")}</p>
                </div>

                <div role="alert" aria-atomic="true">
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle
                            aria-hidden="true"
                            className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400"
                          />
                          <p id="reset-error" className="text-sm text-red-800 dark:text-red-200">
                            {error}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-5">
                    <div>
                      <label htmlFor="new-password" className="block text-sm font-semibold mb-2 text-foreground/80">
                        {t("reset.newPassword")}
                      </label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t("reset.enterNewPassword")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoFocus
                          autoComplete="new-password"
                          aria-invalid={mismatch || undefined}
                          aria-describedby="reset-password-help"
                          className="h-12 rounded-xl border border-border bg-background pe-12 hover:border-muted-foreground focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute end-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                          aria-pressed={showPassword}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>

                      {password && (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-1" aria-hidden="true">
                            {PASSWORD_RULES.map((rule, index) => (
                              <div
                                key={rule.id}
                                className={`h-1 flex-1 rounded-full ${
                                  index < strength.score ? strength.color : "bg-gray-200"
                                }`}
                              />
                            ))}
                          </div>
                          {/* Not hidden: this is the only statement of how strong
                              the password is, and it is a *label* for a bar
                              chart a screen reader cannot see. */}
                          <p className="text-xs font-medium text-muted-foreground">{t(strength.labelKey)}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirm-password" className="block text-sm font-semibold mb-2 text-foreground/80">
                        {t("reset.confirmNewPassword")}
                      </label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t("reset.confirmNewPasswordPlaceholder")}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          autoComplete="new-password"
                          aria-invalid={mismatch || undefined}
                          aria-describedby="reset-password-help"
                          className="h-12 rounded-xl border border-border bg-background pe-12 hover:border-muted-foreground focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute end-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                          aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
                          aria-pressed={showConfirmPassword}
                        >
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {/* `role="status"`, not a bare paragraph: this text appears
                          and disappears as somebody types, and unannounced it is
                          a confirmation only a sighted reader gets. */}
                      <p className="text-xs mt-1 min-h-4" role="status" aria-live="polite">
                        {mismatch && (
                          <span className="text-red-600 dark:text-red-400">{t("reset.passwordsDoNotMatch")}</span>
                        )}
                        {matches && <span className="text-[#FF2D55]">{t("reset.passwordsMatch")}</span>}
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending || !strength.acceptable || !confirmPassword}
                      className="w-full h-14 bg-gradient-to-r from-[#FF2D55] via-[#E6284D] to-[#CC2345] text-white font-semibold text-base rounded-xl hover:from-[#E6284D] hover:via-[#CC2345] hover:to-[#B31F3D] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,85,0.35)] active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {t("reset.updating")}
                        </span>
                      ) : (
                        t("reset.submit")
                      )}
                    </Button>
                  </div>
                </form>

                {/*
                  The checklist and the meter read from the same
                  `strength.met`, so they cannot disagree — which is the defect the
                  two copies of the scorer had. `aria-live` is deliberately
                  absent: it fires on every keystroke, and a screen reader saying
                  "met, not met, not met" as somebody types a password is worse
                  than useless.
                */}
                <div id="reset-password-help" className="mt-6 p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm font-medium text-foreground/80 mb-2">{t("reset.requirementsTitle")}</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const met = strength.met[rule.id];
                      return (
                        <li key={rule.id} className={`flex items-center gap-2 ${met ? "text-[#FF2D55]" : ""}`}>
                          <span aria-hidden="true">{met ? "✓" : "•"}</span>
                          <span>
                            {t(rule.labelKey)}
                            {/* The tick is decorative; the state is the colour, so
                                it has to reach the reader some other way. */}
                            <span className="sr-only">{met ? ` — ${t("reset.passwordsMatch")}` : ""}</span>
                          </span>
                        </li>
                      );
                    })}
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

export default ResetPasswordForm;
