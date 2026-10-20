"use client";

/**
 * Modern Authentication Modal
 * Beautiful Airbnb-inspired login/signup experience
 */

import { useAuth } from "@/hooks/useAuth";
import { ViewIcon, ViewOffIcon } from "@/utils/icons";
import { useTranslations } from "next-intl";
import React, { useState, useEffect, useTransition } from "react";
import { InvitationStep } from "./InvitationStep";
import { PasswordStrength } from "./PasswordStrength";
import { SocialAuthButtons } from "./SocialAuthButtons";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type OAuthProvider, getEnabledProviders } from "@/lib/config/oauth";
import { type StorageErrorInfo, clearSupabaseStorage, testStorageAvailability } from "@/lib/errors/storage-handler";
import { createLogger } from "@/lib/logger";
import { isStorageHealthy } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/validators/email";

const logger = createLogger("AuthModal");

type ModalType = {
  /**
   * Which form the modal opens on.
   *
   * This used to be inferred from a *label*: `buttonValue?: "Login" |
   * "Registration"` doubled as both the button text and the mode switch
   * (`mode = buttonValue === "Registration" ? "signup" : "login"`). Which is why
   * the trigger in the navbar and the mobile menu could not be translated — a
   * German "Anmelden" is not `"Login"`, so passing it would have silently opened
   * the sign-up form. The label and the mode are separate concerns and are now
   * separate props.
   */
  mode?: "login" | "signup";
  /**
   * Label for the trigger button. Pass a translated string; falls back to the
   * built-in English so an untranslated caller still reads correctly.
   */
  buttonLabel?: string;
  fullScreen?: boolean;
  oneProductComponent?: boolean;
  becomeSharerBlock?: boolean;
  isOpen?: boolean; // Controlled mode - external open state
  onClose?: () => void; // Controlled mode - external close handler
};

const AuthenticationUserModal: React.FC<ModalType> = ({
  becomeSharerBlock,
  mode = "login",
  buttonLabel,
  oneProductComponent,
  fullScreen,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}) => {
  const t = useTranslations("AuthFlow");
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const internalOnOpen = React.useCallback(() => setInternalIsOpen(true), []);
  const internalOnClose = () => setInternalIsOpen(false);

  // Use external state if provided (controlled), otherwise use internal state (uncontrolled)
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;
  const onCloseHandler = externalOnClose || internalOnClose;

  const { loginWithPassword, loginWithProvider, register, authError, clearError, isAuth } = useAuth();

  // Only create onOpen wrapper for uncontrolled mode
  const onOpen = React.useCallback(() => {
    if (!isControlled) {
      logger.debug("Opening auth modal", { mode });
      internalOnOpen();
    }
  }, [isControlled, mode, internalOnOpen]);

  const [activeMode, setActiveMode] = useState<"login" | "signup">(mode);
  // A caller that switches mode between renders (a navbar that re-renders on a
  // route change) should not be left showing the previous form.
  React.useEffect(() => setActiveMode(mode), [mode]);

  const buttonText = buttonLabel ?? (mode === "signup" ? "Registration" : "Login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [storageError, setStorageError] = useState<StorageErrorInfo | null>(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);
  const [isRecoveringStorage, setIsRecoveringStorage] = useState(false);
  const [emailError, setEmailError] = useState<string>("");
  const [showInvitation, setShowInvitation] = useState(false);
  const [clearFailed, setClearFailed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      clearError();
      checkStorageAvailability();
      // Clean up any OAuth hash fragments in URL to prevent display issues
      if (window.location.hash.includes("access_token") || window.location.hash.includes("error")) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    }
  }, [isOpen, clearError]);

  useEffect(() => {
    if (isAuth) {
      handleClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  async function checkStorageAvailability() {
    setIsCheckingStorage(true);
    try {
      const result = await testStorageAvailability();
      if (result.error) {
        setStorageError(result.error);
      } else if (!result.localStorage && !result.indexedDB) {
        // The `message` and `userGuidance` fields are *rendered* to the reader
        // two lines below, so they cannot hold a key — this component keeps its
        // own state for the copy and leaves the type alone.
        setStorageError({ type: "unknown", message: "", userGuidance: "", canRecover: false });
      } else {
        setStorageError(null);
      }
    } catch (error) {
      logger.error("Storage check failed", error as Error);
    } finally {
      setIsCheckingStorage(false);
    }
  }

  const handleClearStorage = async () => {
    setIsRecoveringStorage(true);
    try {
      const success = await clearSupabaseStorage();
      if (success) {
        setStorageError(null);
        window.location.reload();
      } else {
        setStorageError({ type: "unknown", message: "", userGuidance: "", canRecover: true });
        setClearFailed(true);
      }
    } catch (error) {
      logger.error("Storage recovery failed", error as Error);
    } finally {
      setIsRecoveringStorage(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);

    // Clear error when user starts typing
    if (emailError && newEmail !== email) {
      setEmailError("");
    }
  };

  const handleEmailBlur = () => {
    const error = validateEmail(email);
    setEmailError(error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logger.debug("Form submitted", { mode, email });

    // Validate email before submission
    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      logger.warn("Cannot submit: invalid email");
      return;
    }

    if (storageError) {
      logger.error("Cannot authenticate: storage error present");
      return;
    }

    clearError();

    startTransition(async () => {
      try {
        if (activeMode === "login") {
          logger.debug("Attempting login...");
          const result = await loginWithPassword(email, password);
          logger.debug("Login result", {
            success: result.success,
          });

          if (result.success) {
            logger.info("Login successful, closing modal");
            handleClose();
          } else {
            logger.error("Login failed", new Error(result.error || "Login failed"));
          }
        } else {
          logger.debug("Attempting registration...");
          const result = await register({
            email,
            password,
            firstName,
            lastName,
          });
          logger.debug("Registration result", {
            success: result.success,
          });

          if (result.success) {
            logger.info("Registration successful, showing invitation");
            setShowInvitation(true);
          } else {
            logger.error("Registration failed", new Error(result.error || "Registration failed"));
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";
        if (errorMessage.includes("storage") || errorMessage.includes("indexeddb") || errorMessage.includes("ldb")) {
          await checkStorageAvailability();
        }
      }
    });
  };

  const handleSocialLogin = async (provider: OAuthProvider) => {
    if (storageError) {
      logger.error("Cannot authenticate: storage error present");
      return;
    }

    clearError();
    try {
      // Store current location for return after OAuth
      sessionStorage.setItem("auth_return_url", window.location.pathname);
      await loginWithProvider(provider);
      // Close modal immediately - callback page will handle the rest
      handleClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";
      if (errorMessage.includes("storage") || errorMessage.includes("indexeddb")) {
        await checkStorageAvailability();
      }
    }
  };

  const toggleMode = () => {
    setActiveMode(activeMode === "login" ? "signup" : "login");
    clearError();
  };

  function handleClose() {
    logger.debug("Closing modal");
    onCloseHandler();
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setShowPassword(false);
    setStorageError(null);
    setEmailError("");
    setShowInvitation(false);
    setClearFailed(false);
    clearError();
  }

  return (
    <>
      {/* Trigger Buttons - Only render in uncontrolled mode */}
      {!isControlled && fullScreen ? (
        <button type="button" onClick={onOpen} className="w-full text-start">
          {buttonText ?? t("logIn")}
        </button>
      ) : !isControlled && oneProductComponent ? (
        <Button
          onClick={onOpen}
          className="uppercase brand-gradient text-white w-full font-semibold hover:brand-gradient-hover hover:-translate-y-px hover:shadow-lg hover:shadow-primary/40 transition-all"
        >
          {t("modal.requestLabel")}
        </Button>
      ) : !isControlled && becomeSharerBlock ? (
        <Button
          onClick={onOpen}
          variant="ghost"
          className="me-2 hidden md:block text-foreground text-base font-semibold hover:text-primary transition-colors"
        >
          {t("modal.becomeSharer")}
        </Button>
      ) : !isControlled ? (
        <Button
          onClick={onOpen}
          variant="outline"
          className="bg-background text-foreground border border-border font-semibold px-6 hover:border-foreground hover:shadow-md transition-all"
        >
          {buttonText ?? t("logIn")}
        </Button>
      ) : null}

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
        <DialogContent variant="glass" className="max-w-[568px] rounded-2xl p-0" aria-describedby={undefined}>
          {/* Header with proper accessibility */}
          <DialogHeader className="border-b border-border py-4 px-6 relative">
            <DialogTitle className="text-base font-semibold text-center text-foreground">
              {activeMode === "login" ? t("logIn") : t("signUp")}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6">
            {showInvitation ? (
              <InvitationStep onClose={handleClose} />
            ) : (
              <div key={mode} className="transition-opacity duration-200">
                {/* Welcome Message */}
                <div className="mb-6">
                  <h2 className="text-[22px] font-semibold mb-2 text-foreground">{t("modal.welcomeTitle")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {activeMode === "login" ? t("modal.loginBody") : t("modal.signupBody")}
                  </p>
                </div>

                {/* Storage Warnings */}
                {!isStorageHealthy && !storageError && (
                  <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5 text-orange-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-orange-800">{t("modal.memoryOnlyTitle")}</h3>
                        <p className="mt-1 text-sm text-orange-700 mb-2">{t("modal.memoryOnlyBody")}</p>
                        <Button
                          size="sm"
                          onClick={handleClearStorage}
                          disabled={isRecoveringStorage}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          {isRecoveringStorage ? t("modal.clearing") : t("modal.clearStorageToPersist")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isCheckingStorage && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg aria-hidden="true" className="h-5 w-5 text-blue-400 animate-spin" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-blue-800" role="status" aria-live="polite">
                        {t("modal.checkingStorage")}
                      </p>
                    </div>
                  </div>
                )}

                {storageError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-red-800">{t("modal.storageErrorTitle")}</h3>
                        {/* Translated copy, not the error type's prose fields. */}
                        <p className="mt-1 text-sm text-red-700 mb-2">
                          {clearFailed ? t("modal.clearStorageFailed") : t("modal.storageUnavailable")}
                        </p>
                        <p className="text-sm text-red-600 mb-3">
                          {clearFailed ? t("modal.manualClearGuidance") : t("modal.enableStorageGuidance")}
                        </p>
                        {storageError.canRecover && (
                          <Button
                            size="sm"
                            onClick={handleClearStorage}
                            disabled={isRecoveringStorage}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {isRecoveringStorage ? t("modal.clearing") : t("modal.clearStorageAndReload")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Alert with ARIA live region */}
                <div role="alert" aria-live="polite" aria-atomic="true">
                  {authError && !storageError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                      {/* The code, resolved. It was Sanitised and rendered as
                          prose before Phase 26 — and the redaction regex was
                          standing in for a type change. */}
                      <p className="text-sm text-red-800">{t(`errors.${authError}`)}</p>
                    </div>
                  )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-4 items-stretch">
                    {/* Name Fields (Signup only) */}
                    {activeMode === "signup" && (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label htmlFor="auth-first-name" className="sr-only">
                            {t("firstName")}
                          </label>
                          <Input
                            id="auth-first-name"
                            placeholder={t("firstName")}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            autoComplete="given-name"
                            required
                            className="h-11 rounded-lg border border-border hover:border-foreground focus:border-foreground focus:ring-1 focus:ring-foreground"
                          />
                        </div>
                        <div className="flex-1">
                          <label htmlFor="auth-last-name" className="sr-only">
                            {t("lastName")}
                          </label>
                          <Input
                            id="auth-last-name"
                            placeholder={t("lastName")}
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            autoComplete="family-name"
                            required
                            className="h-11 rounded-lg border border-border hover:border-foreground focus:border-foreground focus:ring-1 focus:ring-foreground"
                          />
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    <div>
                      <label htmlFor="auth-email" className="sr-only">
                        {t("emailAddress")}
                      </label>
                      <Input
                        id="auth-email"
                        type="email"
                        placeholder={t("emailAddress")}
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        autoComplete="email"
                        required
                        className={`h-11 rounded-lg border ${
                          emailError ? "border-red-500 dark:border-red-400" : "border-border"
                        } hover:border-foreground focus:border-foreground focus:ring-1 ${
                          emailError ? "focus:ring-red-500 dark:focus:ring-red-400" : "focus:ring-foreground"
                        }`}
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? "auth-email-error" : undefined}
                      />
                      {emailError && (
                        <p id="auth-email-error" className="text-xs text-red-500 dark:text-red-400 mt-1" role="alert">
                          {emailError}
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <label htmlFor="auth-password" className="sr-only">
                        {t("password")}
                      </label>
                      <Input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t("password")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={activeMode === "login" ? "current-password" : "new-password"}
                        required
                        className="h-11 rounded-lg border border-border pe-12 hover:border-foreground focus:border-foreground focus:ring-1 focus:ring-foreground"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                        aria-pressed={showPassword}
                        className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      </button>
                    </div>

                    {/* Password Strength Indicator - Only show during signup */}
                    {activeMode === "signup" && <PasswordStrength password={password} />}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="h-11 w-full brand-gradient text-white font-semibold text-base rounded-lg hover:brand-gradient-hover hover:-translate-y-px hover:shadow-lg hover:shadow-primary/40 active:translate-y-0 transition-all"
                      disabled={isPending}
                    >
                      {isPending
                        ? activeMode === "login"
                          ? t("loggingIn")
                          : t("modal.signingUp")
                        : activeMode === "login"
                          ? t("modal.continueLabel")
                          : t("signUp")}
                    </Button>
                  </div>
                </form>

                {/* Divider & Social Login Buttons */}
                {getEnabledProviders().length > 0 && (
                  <>
                    <div className="flex items-center my-6">
                      <div className="flex-1 border-t border-border" />
                      <span className="px-4 text-xs text-muted-foreground font-medium">{t("orContinueWith")}</span>
                      <div className="flex-1 border-t border-border" />
                    </div>
                    <SocialAuthButtons onSelectProvider={handleSocialLogin} disabled={isPending} />
                  </>
                )}

                {/* Toggle Mode */}
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    {activeMode === "login" ? t("noAccountPrompt") : t("haveAccountPrompt")}{" "}
                    <button
                      type="button"
                      className="font-semibold text-foreground underline hover:text-primary cursor-pointer"
                      onClick={toggleMode}
                    >
                      {activeMode === "login" ? t("signUp") : t("logIn")}
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuthenticationUserModal;
