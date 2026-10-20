/**
 * Tests for `useRecoverySession`.
 *
 * The behaviour being pinned is a bug that was shipped: `/auth/reset-password`
 * used `setTimeout(500)` and then decided once, from a value captured in that
 * render's closure. A recovery session arriving after 500 ms produced "Link
 * expired or invalid" **for a link that worked**, and because the effect's only
 * dependency never changed again, nothing re-read it. The reader's conclusion was
 * drawn from a race.
 *
 * The clock is the whole test. Both tests below would have passed against the old
 * implementation if it had used a shorter delay, which is precisely why the
 * assertions are about *what the reader is told* and *whether it can be taken back*.
 */
import { describe, expect, it } from "bun:test";
import { act, renderHook } from "@testing-library/react";

import { useRecoverySession } from "../../hooks/useRecoverySession";

const TIMEOUT = 1_000;
const POLL = 25;

const start = (over: { isLoading?: boolean; isAuthenticated?: boolean } = {}) =>
  renderHook(
    (props: { isLoading: boolean; isAuthenticated: boolean }) =>
      useRecoverySession({ ...props, timeoutMs: TIMEOUT, pollMs: POLL }),
    { initialProps: { isLoading: true, isAuthenticated: false, ...over } },
  );

describe("recovery session", () => {
  it("says nothing while auth is still loading", () => {
    const { result } = start({ isLoading: true });
    // Not "expired" and not "valid" — a reader who is told "expired" while the
    // session is still being read is told a falsehood.
    expect(result.current).toBe("checking");
  });

  it("reports a session that is already there, with no wait", () => {
    const { result } = start({ isLoading: false, isAuthenticated: true });
    expect(result.current).toBe("valid");
  });

  it("reports expired once auth has settled with no session", async () => {
    const { result } = start({ isLoading: false, isAuthenticated: false });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, TIMEOUT + POLL * 2));
    });
    expect(result.current).toBe("expired");
  });

  it("keeps waiting while the session is late, instead of declaring it expired", async () => {
    const { result, rerender } = start({ isLoading: false, isAuthenticated: false });

    // The session arrives well after the old 500 ms deadline.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, TIMEOUT - POLL * 2));
      rerender({ isLoading: false, isAuthenticated: true });
    });

    expect(result.current).toBe("valid");
  });

  it("lets a late arrival take back an expired verdict", async () => {
    const { result, rerender } = start({ isLoading: false, isAuthenticated: false });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, TIMEOUT + POLL * 2));
    });
    expect(result.current).toBe("expired");

    // Deciding "expired" must never be the last word: being wrong in that
    // direction costs somebody their password reset, so a session that appears
    // afterwards has to be believed.
    await act(async () => {
      rerender({ isLoading: false, isAuthenticated: true });
    });
    expect(result.current).toBe("valid");
  });

  it("does not conclude while auth is still loading, however long it takes", async () => {
    const { result, rerender } = start({ isLoading: true, isAuthenticated: false });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, TIMEOUT * 2));
    });
    // Still loading: the timeout must not fire, because a slow network is not an
    // expired link.
    expect(result.current).toBe("checking");

    // Settled first, then waited: `rerender` and the wait are separate acts
    // because the polling chain is driven by state updates, and a rerender inside
    // the same act as a long sleep does not run the effects in between.
    await act(async () => {
      rerender({ isLoading: false, isAuthenticated: false });
    });
    expect(result.current).toBe("checking");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, TIMEOUT + POLL * 4));
    });
    expect(result.current).toBe("expired");
  });
});
