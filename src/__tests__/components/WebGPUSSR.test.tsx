import { expect, test } from "bun:test";
import { useWebGPU } from "@/lib/gpu/useWebGPU";
import { renderToStaticMarkup } from "react-dom/server";

function Background() {
  const { supported } = useWebGPU();
  return supported ? <canvas /> : <div>CSS fallback</div>;
}

test("cached GPU support does not change server or initial hydration output", () => {
  const previous = sessionStorage.getItem("foodshare:webgpu:supported");
  sessionStorage.setItem("foodshare:webgpu:supported", "true");
  try {
    expect(renderToStaticMarkup(<Background />)).toBe("<div>CSS fallback</div>");
  } finally {
    if (previous === null) sessionStorage.removeItem("foodshare:webgpu:supported");
    else sessionStorage.setItem("foodshare:webgpu:supported", previous);
  }
});
