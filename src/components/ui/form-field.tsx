"use client";

import { forwardRef, useId, ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

export interface FormFieldProps {
  /** Field label */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Help text / description */
  description?: string;
  /** Success message (shown when valid) */
  successMessage?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether to show success state */
  showSuccess?: boolean;
  /** The input/control element */
  children: ReactNode;
  /** Additional CSS classes for container */
  className?: string;
  /** HTML id for the input (auto-generated if not provided) */
  id?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: {
    label: "text-xs mb-1",
    error: "text-xs mt-1",
    description: "text-xs mt-1",
  },
  md: {
    label: "text-sm mb-1.5",
    error: "text-sm mt-1.5",
    description: "text-sm mt-1.5",
  },
  lg: {
    label: "text-base mb-2",
    error: "text-base mt-2",
    description: "text-base mt-2",
  },
};

// Shake animation for errors
const shakeAnimation = {
  initial: { x: 0 },
  shake: {
    x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.5 },
  },
};

// Error message animation
const errorMessageVariants = {
  initial: { opacity: 0, y: -8, height: 0 },
  animate: {
    opacity: 1,
    y: 0,
    height: "auto",
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    height: 0,
    transition: { duration: 0.15, ease: "easeIn" as const },
  },
};

// Success indicator animation
const successVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 500, damping: 25 },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

/**
 * FormField Component
 *
 * A wrapper component for form inputs that provides consistent layout,
 * labels, error handling with animations, and accessibility features.
 *
 * @example
 * // Basic usage with react-hook-form
 * <FormField
 *   label="Email"
 *   error={errors.email?.message}
 *   required
 * >
 *   <Input {...register("email")} type="email" />
 * </FormField>
 *
 * @example
 * // With description and success state
 * <FormField
 *   label="Password"
 *   description="Must be at least 8 characters"
 *   error={errors.password?.message}
 *   showSuccess={!errors.password && dirtyFields.password}
 *   required
 * >
 *   <Input {...register("password")} type="password" />
 * </FormField>
 *
 * @example
 * // Custom size
 * <FormField label="Notes" size="lg">
 *   <Textarea {...register("notes")} />
 * </FormField>
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      error,
      description,
      successMessage,
      required = false,
      disabled = false,
      showSuccess = false,
      children,
      className,
      id: providedId,
      size = "md",
    },
    ref
  ) => {
    const autoId = useId();
    const id = providedId || autoId;
    const errorId = `${id}-error`;
    const descriptionId = `${id}-description`;
    const sizes = sizeClasses[size];

    // Track if we should shake (only on new errors)
    const [shouldShake, setShouldShake] = useState(false);
    const [prevError, setPrevError] = useState(error);

    useEffect(() => {
      if (error && error !== prevError) {
        setShouldShake(true);
        const timer = setTimeout(() => setShouldShake(false), 500);
        return () => clearTimeout(timer);
      }
      setPrevError(error);
    }, [error, prevError]);

    const hasError = Boolean(error);
    const hasSuccess = showSuccess && !hasError;

    return (
      <motion.div
        ref={ref}
        className={cn("space-y-0", className)}
        variants={shakeAnimation}
        animate={shouldShake ? "shake" : "initial"}
      >
        {/* Label row */}
        {label && (
          <div className="flex items-center justify-between">
            <Label
              htmlFor={id}
              className={cn(
                sizes.label,
                disabled && "opacity-50 cursor-not-allowed",
                hasError && "text-destructive"
              )}
            >
              {label}
              {required && (
                <span className="text-destructive ml-0.5" aria-hidden="true">
                  *
                </span>
              )}
            </Label>

            {/* Success indicator */}
            <AnimatePresence>
              {hasSuccess && (
                <motion.span
                  variants={successVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex items-center gap-1 text-green-600 dark:text-green-500"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {successMessage && (
                    <span className="text-xs font-medium">{successMessage}</span>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Input wrapper with error styling */}
        <div
          className={cn(
            "relative transition-all duration-200",
            hasError && "[&>*]:border-destructive [&>*]:focus-visible:ring-destructive/30"
          )}
        >
          {children}
        </div>

        {/* Error message */}
        <AnimatePresence mode="wait">
          {hasError && (
            <motion.div
              variants={errorMessageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              id={errorId}
              role="alert"
              aria-live="polite"
              className="overflow-hidden"
            >
              <div className={cn("flex items-start gap-1.5 text-destructive", sizes.error)}>
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Description (only show when no error) */}
        <AnimatePresence>
          {description && !hasError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              id={descriptionId}
              className={cn("text-muted-foreground", sizes.description)}
            >
              {description}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

FormField.displayName = "FormField";

/**
 * FormFieldGroup - Groups related form fields together
 *
 * @example
 * <FormFieldGroup title="Personal Information" description="Enter your details">
 *   <FormField label="First Name">...</FormField>
 *   <FormField label="Last Name">...</FormField>
 * </FormFieldGroup>
 */
export function FormFieldGroup({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <legend className="text-base font-semibold text-foreground">{title}</legend>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </fieldset>
  );
}

export default FormField;
