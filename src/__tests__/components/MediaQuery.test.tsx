import { afterEach, expect, test } from "bun:test";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { act, cleanup, renderHook } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

function mediaQuery(matches: boolean) {
  const listeners = new Set<() => void>();
  return {
    matches,
    listeners,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
}

test("server output stays identical regardless of browser viewport", () => {
  window.matchMedia = () => mediaQuery(true) as unknown as MediaQueryList;
  function ResponsiveMenu() {
    return <nav>{useMediaQuery("(min-width:800px)") ? "desktop" : "mobile"}</nav>;
  }
  expect(renderToStaticMarkup(<ResponsiveMenu />)).toBe("<nav>mobile</nav>");
});

test("tracks breakpoint changes and releases subscriptions on query changes and unmount", () => {
  const desktop = mediaQuery(true);
  const motion = mediaQuery(false);
  window.matchMedia = (query) =>
    (query === "desktop" ? desktop : motion) as unknown as MediaQueryList;
  const { result, rerender, unmount } = renderHook(({ query }) => useMediaQuery(query), {
    initialProps: { query: "desktop" },
  });
  expect(result.current).toBe(true);
  act(() => {
    desktop.matches = false;
    for (const notify of desktop.listeners) notify();
  });
  expect(result.current).toBe(false);
  rerender({ query: "motion" });
  expect(desktop.listeners.size).toBe(0);
  expect(motion.listeners.size).toBe(1);
  unmount();
  expect(motion.listeners.size).toBe(0);
});
