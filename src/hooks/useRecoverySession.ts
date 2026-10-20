"use client";

/**
 * Is the recovery session here yet?
 *
 * `/auth/reset-password` used to answer this with a timer:
 *
 * ```ts
 * await new Promise((resolve) => setTimeout(resolve, 500));
 * setIsValidSession(isAuthenticated);
 * ```
 *
 * A fixed 500 ms wait, decided once, from a value captured in that render's
 * closure — on the one page whose entire job is to answer "did your reset link
 * work?". If the recovery session took 600 ms to establish, the page rendered
 * **"Link expired or invalid"** for a link that worked. And it stayed there: the
 * effect's only dependency is `isAuthenticated`, which does not change again, so
 * there was no second read. The reader's correct conclusion — that their link had
 * expired and they needed to request another — was drawn from a race.
 *
 * Two properties replace it:
 *
 * 1. **Decide on evidence, not on a deadline.** Wait while auth is loading, then
 *    poll for the session for a bounded window. The bound exists only so a link
 *    that really is dead reaches the answer instead of spinning forever.
 * 2. **A late arrival heals the page.** Once decided invalid, a session that
 *    appears later still flips it to valid. Deciding "expired" is never allowed to
 *    be the last word, because being wrong in that direction costs somebody their
 *    password reset.
 */
import { useEffect, useRef, useState } from "react";

/** How long to keep looking before telling somebody their link is dead. */
export const RECOVERY_SESSION_TIMEOUT_MS = 10_000;
/** Gap between reads of the session store. */
export const RECOVERY_SESSION_POLL_MS = 250;

export type RecoverySessionState = "checking" | "valid" | "expired";

export interface UseRecoverySessionOptions {
  /** `true` while auth itself is still resolving — nothing can be concluded yet. */
  isLoading: boolean;
  isAuthenticated: boolean;
  timeoutMs?: number;
  pollMs?: number;
}

export function useRecoverySession({
  isLoading,
  isAuthenticated,
  timeoutMs = RECOVERY_SESSION_TIMEOUT_MS,
  pollMs = RECOVERY_SESSION_POLL_MS,
}: UseRecoverySessionOptions): RecoverySessionState {
  const [concluded, setConcluded] = useState(false);
  const [tick, setTick] = useState(0);
  const start = useRef<number | null>(null);

  const now = () => (typeof performance === "undefined" ? Date.now() : performance.now());

  // Late arrival, and the fast path: a session that is already there is `valid`
  // immediately, with no polling at all. `/auth/callback` exchanges the code
  // server-side before redirecting, so on a working link the cookie is already
  // set by the time this page loads.
  useEffect(() => {
    if (!isAuthenticated) return;
    setConcluded(true);
  }, [isAuthenticated]);

  // The bounded search, started once auth has settled. Each tick re-reads the
  // elapsed time rather than concluding on the first one — the first version
  // scheduled `setConcluded` after a single interval, which concluded on the
  // first poll and made the timeout decorative.
  // `now` is re-created every render, so listing it would restart the poll on
  // every render; `tick` is listed because it is the deliberate re-trigger that
  // schedules the next poll, not because the body reads it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate — see above
  useEffect(() => {
    if (isLoading || isAuthenticated || concluded) return;

    if (start.current === null) start.current = now();
    if (now() - start.current >= timeoutMs) {
      setConcluded(true);
      return;
    }

    const timer = setTimeout(() => setTick((value) => value + 1), pollMs);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, concluded, tick, timeoutMs, pollMs]);

  if (isAuthenticated) return "valid";
  if (!isLoading && concluded) return "expired";
  return "checking";
}
