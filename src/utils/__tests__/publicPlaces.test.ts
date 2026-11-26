import { describe, expect, it } from "bun:test";
import { hasExactPublicLocation } from "../publicPlaces";

describe("hasExactPublicLocation", () => {
  it("marks fridges and food banks as public places", () => {
    expect(hasExactPublicLocation("fridge")).toBe(true);
    expect(hasExactPublicLocation("foodbank")).toBe(true);
    expect(hasExactPublicLocation("Fridge")).toBe(true);
  });

  it("keeps the privacy approximation for every other listing type", () => {
    for (const type of ["food", "business", "volunteer", "challenge", "organisation", ""]) {
      expect(hasExactPublicLocation(type)).toBe(false);
    }
    expect(hasExactPublicLocation(null)).toBe(false);
    expect(hasExactPublicLocation(undefined)).toBe(false);
  });
});
