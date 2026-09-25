import { expect, test } from "bun:test";
import { useAdvancedScroll } from "@/hooks/useAdvancedScroll";
import { renderToStaticMarkup } from "react-dom/server";

function ScrollState() {
  const state = useAdvancedScroll();
  return <output>{JSON.stringify(state)}</output>;
}

test("scroll navigation can render without browser globals", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    get() {
      throw new Error("window must not be accessed while rendering");
    },
  });
  try {
    expect(renderToStaticMarkup(<ScrollState />)).toContain("&quot;isAtTop&quot;:true");
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("saved browser scroll state does not change the initial hydration markup", () => {
  const before = renderToStaticMarkup(<ScrollState />);
  sessionStorage.setItem(
    "foodshare_scroll_state",
    JSON.stringify({
      scrollY: 500,
      isCompact: true,
      timestamp: Date.now(),
    })
  );
  try {
    expect(renderToStaticMarkup(<ScrollState />)).toBe(before);
  } finally {
    sessionStorage.removeItem("foodshare_scroll_state");
  }
});
