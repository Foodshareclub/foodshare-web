'use client';

/**
 * Modern Authentication Modal
 * Beautiful Airbnb-inspired login/signup experience
 */

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks";
import { ViewIcon, ViewOffIcon } from "@/utils/icons";

import { PasswordStrength } from "./PasswordStrength";
import facebook from "@/assets/facebookblue.svg";
import apple from "@/assets/apple.svg";
import google from "@/assets/google.svg";
import { isStorageHealthy } from "@/lib/supabase/client";
import {
  testStorageAvailability,
  clearSupabaseStorage,
  type StorageErrorInfo,
} from "@/utils/storageErrorHandler";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";

const logger = createLogger("AuthModal");

type ModalType = {
  buttonValue?: "Login" | "Registration";
  fullScreen?: boolean;
  oneProductComponent?: boolean;
  becomeSharerBlock?: boolean;
  thunk?: any; // Legacy support - ignored
  isOpen?: boolean; // Controlled mode - external open state
  onClose?: () => void; // Controlled mode - external close handler
};

const AuthenticationUserModal: React.FC<ModalType> = ({
  becomeSharerBlock,
  buttonValue = "Login",
  oneProductComponent,
  fullScreen,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}) => {
  const t = useTranslations();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const internalOnOpen = () => setInternalIsOpen(true);
  const internalOnClose = () => setInternalIsOpen(false);

  // Use external state if provided (controlled), otherwise use internal state (uncontrolled)
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;
  const onCloseHandler = externalOnClose || internalOnClose;

  const { loginWithPassword, loginWithProvider, register, authError, clearError, isAuth } =
    useAuth();

  // Only create onOpen wrapper for uncontrolled mode
  const onOpen = React.useCallback(() => {
    if (!isControlled) {
      logger.debug("Opening auth modal", {
        buttonValue,
        mode: buttonValue === "Registration" ? "signup" : "login",
      });
      internalOnOpen();
    }
  }, [isControlled, buttonValue]);

  const [mode, setMode] = useState<"login" | "signup">(
    buttonValue === "Registration" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [storageError, setStorageError] = useState<StorageErrorInfo | null>(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);
  const [isRecoveringStorage, setIsRecoveringStorage] = useState(false);
  const [emailError, setEmailError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      clearError();
      checkStorageAvailability();
      // Clean up any OAuth hash fragments in URL to prevent display issues
      if (window.location.hash.includes("access_token") || window.location.hash.includes("error")) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );
      }
    }
  }, [isOpen, clearError]);

  useEffect(() => {
    if (isAuth) {
      handleClose();
    }
  }, [isAuth]);

  const checkStorageAvailability = async () => {
    setIsCheckingStorage(true);
    try {
      const result = await testStorageAvailability();
      if (result.error) {
        setStorageError(result.error);
      } else if (!result.localStorage && !result.indexedDB) {
        setStorageError({
          type: "unknown",
          message: "Browser storage is unavailable",
          userGuidance: "Please enable cookies and storage in your browser settings.",
          canRecover: false,
        });
      } else {
        setStorageError(null);
      }
    } catch (error) {
      logger.error("Storage check failed", error as Error);
    } finally {
      setIsCheckingStorage(false);
    }
  };

  const handleClearStorage = async () => {
    setIsRecoveringStorage(true);
    try {
      const success = await clearSupabaseStorage();
      if (success) {
        setStorageError(null);
        window.location.reload();
      } else {
        setStorageError({
          type: "unknown",
          message: "Failed to clear storage",
          userGuidance: "Please manually clear your browser cache and refresh the page.",
          canRecover: true,
        });
      }
    } catch (error) {
      logger.error("Storage recovery failed", error as Error);
    } finally {
      setIsRecoveringStorage(false);
    }
  };

  const validateEmail = (email: string): string => {
    if (!email) {
      return "";
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }

    return "";
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

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsLoading(true);
    clearError();

    try {
      if (mode === "login") {
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
          logger.info("Registration successful, closing modal");
          handleClose();
        } else {
          logger.error("Registration failed", new Error(result.error || "Registration failed"));
        }
      }
    } catch (error: any) {
      if (
        error?.message?.toLowerCase().includes("storage") ||
        error?.message?.toLowerCase().includes("indexeddb") ||
        error?.message?.toLowerCase().includes("ldb")
      ) {
        await checkStorageAvailability();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook" | "apple") => {
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
    } catch (error: any) {
      if (
        error?.message?.toLowerCase().includes("storage") ||
        error?.message?.toLowerCase().includes("indexeddb")
      ) {
        await checkStorageAvailability();
      }
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    clearError();
  };

  const handleClose = () => {
    logger.debug("Closing modal");
    onCloseHandler();
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setShowPassword(false);
    setStorageError(null);
    setEmailError("");
    clearError();
  };

  return (
    <>
      {/* Trigger Buttons - Only render in uncontrolled mode */}
      {!isControlled && fullScreen ? (
        <button onClick={onOpen} className="w-full text-left">
          "{buttonValue}"
        </button>
      ) : !isControlled && oneProductComponent ? (
        <Button
          onClick={onOpen}
          className="uppercase brand-gradient text-white w-full font-semibold hover:brand-gradient-hover hover:-translate-y-px hover:shadow-lg hover:shadow-primary/40 transition-all"
        >
          "Request"
        </Button>
      ) : !isControlled && becomeSharerBlock ? (
        <Button
          onClick={onOpen}
          variant="ghost"
          className="mr-2 hidden md:block text-foreground text-base font-semibold hover:text-primary transition-colors"
        >
          "Become a Sharer"
        </Button>
      ) : !isControlled ? (
        <Button
          onClick={onOpen}
          variant="outline"
          className="bg-background text-foreground border border-border font-semibold px-6 hover:border-foreground hover:shadow-md transition-all"
        >
          "{buttonValue}"
        </Button>
      ) : null}

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
        <DialogContent variant="glass" className="max-w-[568px] rounded-2xl p-0" aria-describedby={undefined}>
          {/* Header with proper accessibility */}
          <DialogHeader className="border-b border-border py-4 px-6 relative">
            <DialogTitle className="text-base font-semibold text-center text-foreground">
              {mode === "login" ? "Log in" : "Sign up"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6">
            <div key={mode} className="transition-opacity duration-200">
                {/* Welcome Message */}
                <div className="mb-6">
                  <h2 className="text-[22px] font-semibold mb-2 text-foreground">
                    "Welcome to FoodShare"
                  </h2>
                  <p className="text-sm text-muted-foreground">

                    {mode === "login"
                      ? "Log in to continue sharing and discovering food"
                      : "Create an account to start sharing food in your community"}

                  </p>
                </div>

                {/* Storage Warnings */}
                {!isStorageHealthy && !storageError && (
                  <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg
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
                        <h3 className="text-sm font-medium text-orange-800">
                          "Memory-Only Mode"
                        </h3>
                        <p className="mt-1 text-sm text-orange-700 mb-2">

                          Your browser storage is degraded. You can log in, but your session will
                          only last while this tab is open.

                        </p>
                        <Button
                          size="sm"
                          onClick={handleClearStorage}
                          disabled={isRecoveringStorage}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          {isRecoveringStorage ? (
                            "Clearing..."
                          ) : (
                            "Clear Storage to Enable Persistence"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isCheckingStorage && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400 animate-spin" viewBox="0 0 24 24">
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
                      <p className="text-sm font-medium text-blue-800">
                        "Checking browser storage..."
                      </p>
                    </div>
                  </div>
                )}

                {storageError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg
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
                        <h3 className="text-sm font-medium text-red-800">
                          "Storage Error"
                        </h3>
                        <p className="mt-1 text-sm text-red-700 mb-2">{storageError.message}</p>
                        <p className="text-sm text-red-600 mb-3">{storageError.userGuidance}</p>
                        {storageError.canRecover && (
                          <Button
                            size="sm"
                            onClick={handleClearStorage}
                            disabled={isRecoveringStorage}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {isRecoveringStorage ? (
                              "Clearing..."
                            ) : (
                              "Clear Browser Storage & Reload"
                            )}
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
                      <p className="text-sm text-red-800">
                        {/* Sanitize error message to remove any encoded tokens */}
                        {authError.replace(/[a-zA-Z0-9+/=]{20,}/g, "[token]")}
                        {process.env.NODE_ENV === 'development' && authError.includes("redirect") && (
                          <span className="block mt-2 text-xs text-orange-600">
                            💡 Tip: Add http://localhost:3000/auth/callback to Supabase allowed
                            redirect URLs
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-4 items-stretch">
                    {/* Name Fields (Signup only) */}
                    {mode === "signup" && (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Input
                            placeholder={"First name"}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            autoComplete="given-name"
                            required
                            className="h-11 rounded-lg border border-border hover:border-foreground focus:border-foreground focus:ring-1 focus:ring-foreground"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder={"Last name"}
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
                      <Input
                        type="email"
                        placeholder={"Email address"}
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        autoComplete="email"
                        required
                        className={`h-11 rounded-lg border ${emailError ? "border-red-500 dark:border-red-400" : "border-border"
                          } hover:border-foreground focus:border-foreground focus:ring-1 ${emailError ? "focus:ring-red-500 dark:focus:ring-red-400" : "focus:ring-foreground"
                          }`}
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? "email-error" : undefined}
                      />
                      {emailError && (
                        <p id="email-error" className="text-xs text-red-500 dark:text-red-400 mt-1" role="alert">
                          {emailError}
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={"Password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                        className="h-11 rounded-lg border border-border pr-12 hover:border-foreground focus:border-foreground focus:ring-1 focus:ring-foreground"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      </button>
                    </div>

                    {/* Password Strength Indicator - Only show during signup */}
                    {mode === "signup" && <PasswordStrength password={password} />}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="h-11 w-full brand-gradient text-white font-semibold text-base rounded-lg hover:brand-gradient-hover hover:-translate-y-px hover:shadow-lg hover:shadow-primary/40 active:translate-y-0 transition-all"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        mode === "login" ? (
                          "Logging in..."
                        ) : (
                          "Signing up..."
                        )
                      ) : (
                        mode === "login" ? "Continue" : "Sign up"
                      )}
                    </Button>
                  </div>
                </form>

                {/* Divider */}
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-border" />
                  <span className="px-4 text-xs text-muted-foreground font-medium">
                    "or"
                  </span>
                  <div className="flex-1 border-t border-border" />
                </div>

                {/* Social Login Buttons */}
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    onClick={() => handleSocialLogin("google")}
                    variant="outline"
                    className="w-full h-11 border-border rounded-lg font-medium text-sm hover:border-foreground hover:bg-muted transition-all"
                  >
                    <img src={google.src} alt="Google" className="w-5 h-5 mr-3" />
                    "Continue with Google"
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSocialLogin("facebook")}
                    variant="outline"
                    className="w-full h-11 border-border rounded-lg font-medium text-sm hover:border-foreground hover:bg-muted transition-all"
                  >
                    <img src={facebook.src} alt="Facebook" className="w-5 h-5 mr-3" />
                    "Continue with Facebook"
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSocialLogin("apple")}
                    variant="outline"
                    className="w-full h-11 border-border rounded-lg font-medium text-sm hover:border-foreground hover:bg-muted transition-all"
                  >
                    <img src={apple.src} alt="Apple" className="w-5 h-5 mr-3" />
                    "Continue with Apple"
                  </Button>
                </div>

                {/* Toggle Mode */}
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">

                    {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                    {" "}
                    <button
                      type="button"
                      className="font-semibold text-foreground underline hover:text-primary cursor-pointer"
                      onClick={toggleMode}
                    >
                      "{mode === "login" ? "Sign up" : "Log in"}"
                    </button>
                  </p>
                </div>
              </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuthenticationUserModal;
