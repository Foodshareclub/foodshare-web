import { describe, expect, it } from "bun:test";
import { createPillMarkerIcon } from "@/hooks/useMarkerIcon";

const html = (label: string, state?: "default" | "hovered" | "selected") =>
  String(createPillMarkerIcon(label, state).options.html);
const className = (label: string, state?: "default" | "hovered" | "selected") =>
  String(createPillMarkerIcon(label, state).options.className);

describe("createPillMarkerIcon", () => {
  it("renders the label in a 32px pill", () => {
    expect(html("Bread rolls")).toContain("Bread rolls");
    expect(html("Bread rolls")).toContain("h-8");
  });

  it("inverts the selected marker to the foreground colour", () => {
    expect(html("Jam", "selected")).toContain("bg-foreground");
    expect(html("Jam", "default")).toContain("bg-background");
  });

  it("keeps a focus ring on the focusable icon element", () => {
    expect(className("Jam")).toContain("focus-visible:ring-2");
  });

  it("reuses the icon for the same label and state", () => {
    expect(createPillMarkerIcon("Eggs", "hovered")).toBe(createPillMarkerIcon("Eggs", "hovered"));
    expect(createPillMarkerIcon("Eggs", "hovered")).not.toBe(createPillMarkerIcon("Eggs", "selected"));
  });

  it("escapes listing names before putting them in marker HTML", () => {
    const out = html(`<img src=x onerror="alert(1)">&'`);
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;");
  });
});
