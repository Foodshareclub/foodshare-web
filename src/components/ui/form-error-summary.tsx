"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormError {
  /** Field name or identifier */
  field: string;
  /** Error message */
  message: string;
}

export interface FormErrorSummaryProps {
  /** Array of form errors */
  errors: FormError[];
  /** Title for the error summary */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback when clicking on an error (e.g., to focus the field) */
  onErrorClick?: (field: string) => void;
}

/**
 * FormErrorSummary - Consolidated form validation error display
 *
 * Displays all form errors in a single summary box, making it easy for users
 * to see all issues at once. Clicking on an error can optionally focus the field.
 *
 * @example
 * // Basic usage
 * const errors = [
 *   { field: 'email', message: 'Invalid email address' },
 *   { field: 'password', message: 'Password must be at least 8 characters' },
 * ];
 *
 * {errors.length > 0 && <FormErrorSummary errors={errors} />}
 *
 * @example
 * // With field focusing
 * <FormErrorSummary
 *   errors={errors}
 *   onErrorClick={(field) => {
 *     document.getElementById(field)?.focus();
 *   }}
 * />
 */
export function FormErrorSummary({
  errors,
  title = "Please fix the following errors:",
  className,
  onErrorClick,
}: FormErrorSummaryProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("rounded-lg border border-destructive/50 bg-destructive/10 p-4", className)}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">{title}</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-destructive/90">
            {errors.map((error) => (
              <li key={error.field}>
                {onErrorClick ? (
                  <button
                    type="button"
                    className="hover:underline focus:underline focus:outline-none text-left"
                    onClick={() => onErrorClick(error.field)}
                  >
                    <span className="font-medium">{error.field}:</span> {error.message}
                  </button>
                ) : (
                  <>
                    <span className="font-medium">{error.field}:</span> {error.message}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to convert react-hook-form errors to FormError array
 *
 * @example
 * import { useForm } from 'react-hook-form';
 *
 * const { formState: { errors } } = useForm();
 * const formErrors = rhfErrorsToFormErrors(errors);
 *
 * <FormErrorSummary errors={formErrors} />
 */
export function rhfErrorsToFormErrors(
  errors: Record<string, { message?: string } | undefined>
): FormError[] {
  return Object.entries(errors)
    .filter(([, error]) => error?.message)
    .map(([field, error]) => ({
      field,
      message: error?.message || "Invalid value",
    }));
}

export default FormErrorSummary;
