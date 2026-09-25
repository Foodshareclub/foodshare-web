import { describe, expect, test } from "bun:test";
import { safeInternalPath } from "@/lib/security/redirect";

describe("safeInternalPath", () => {
  test("keeps internal paths", () => {
    expect(safeInternalPath("/food/123")).toBe("/food/123");
    expect(safeInternalPath("/settings/language")).toBe("/settings/language");
  });

  test("falls back for absolute URLs", () => {
    expect(safeInternalPath("https://evil.example/steal")).toBe("/");
    expect(safeInternalPath("http://evil.example")).toBe("/");
    expect(safeInternalPath("javascript:alert(1)")).toBe("/");
    expect(safeInternalPath("JavaScript:alert(1)")).toBe("/");
  });

  test("falls back for protocol-relative and backslash variants", () => {
    expect(safeInternalPath("//evil.example")).toBe("/");
    expect(safeInternalPath("/\\evil.example")).toBe("/");
    expect(safeInternalPath("\\\\evil.example")).toBe("/");
  });

  test("falls back for control characters", () => {
    expect(safeInternalPath("/food\nSet-Cookie: a=b")).toBe("/");
    expect(safeInternalPath("/food\r\nLocation: //evil.example")).toBe("/");
    expect(safeInternalPath("/food\u0000")).toBe("/");
  });

  test("falls back for relative and empty input", () => {
    expect(safeInternalPath("food/123")).toBe("/");
    expect(safeInternalPath("")).toBe("/");
    expect(safeInternalPath(null)).toBe("/");
    expect(safeInternalPath(undefined)).toBe("/");
  });

  test("honours a custom fallback", () => {
    expect(safeInternalPath("https://evil.example", "/food")).toBe("/food");
  });
});
