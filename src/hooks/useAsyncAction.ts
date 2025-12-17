"use client";

import { useTransition, useCallback, useState } from "react";
import { useActionToast } from "./useActionToast";

export interface AsyncActionOptions {
  /** Success message to show in toast */
  successMessage?: string;
  /** Error message to show in toast (defaults to error.message) */
  errorMessage?: string;
  /** Callback on success */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface AsyncActionResult<T> {
  /** Execute the async action */
  execute: () => Promise<T | undefined>;
  /** Whether the action is currently pending */
  isPending: boolean;
  /** The last error that occurred */
  error: Error | null;
  /** Reset the error state */
  resetError: () => void;
}

/**
 * useAsyncAction - Hook for async operations with automatic error handling
 *
 * Wraps async actions with loading state, error handling, and toast notifications.
 * Uses React's useTransition for non-blocking UI updates.
 *
 * @example
 * // Basic usage
 * const { execute, isPending } = useAsyncAction(
 *   () => deleteItem(id),
 *   { successMessage: 'Item deleted!' }
 * );
 *
 * <Button onClick={execute} loading={isPending}>
 *   Delete
 * </Button>
 *
 * @example
 * // With callbacks
 * const { execute, isPending, error } = useAsyncAction(
 *   () => saveForm(data),
 *   {
 *     successMessage: 'Saved successfully',
 *     onSuccess: () => router.push('/dashboard'),
 *     onError: (err) => console.error(err),
 *   }
 * );
 */
export function useAsyncAction<T>(
  action: () => Promise<T>,
  options: AsyncActionOptions = {}
): AsyncActionResult<T> {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<Error | null>(null);
  const toast = useActionToast();

  const execute = useCallback(async () => {
    setError(null);

    return new Promise<T | undefined>((resolve) => {
      startTransition(async () => {
        try {
          const result = await action();

          if (options.successMessage) {
            toast.success(options.successMessage);
          }

          options.onSuccess?.();
          resolve(result);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);

          toast.error(options.errorMessage || error.message || "Something went wrong");

          options.onError?.(error);
          resolve(undefined);
        }
      });
    });
  }, [action, options, toast]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    execute,
    isPending,
    error,
    resetError,
  };
}

/**
 * useAsyncCallback - Simpler version that just wraps a callback
 *
 * @example
 * const handleDelete = useAsyncCallback(async () => {
 *   await deleteItem(id);
 * }, { successMessage: 'Deleted!' });
 *
 * <Button onClick={handleDelete.execute} loading={handleDelete.isPending}>
 *   Delete
 * </Button>
 */
export function useAsyncCallback<T>(callback: () => Promise<T>, options: AsyncActionOptions = {}) {
  return useAsyncAction(callback, options);
}

export default useAsyncAction;
