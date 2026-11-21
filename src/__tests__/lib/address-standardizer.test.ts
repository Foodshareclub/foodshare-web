import { describe, expect, test } from "bun:test";
import { standardizeDisplayAddress, stripHouseNumber } from "@/lib/address-standardizer";

describe("stripHouseNumber", () => {
  test("strips standalone leading house numbers", () => {
    expect(stripHouseNumber("2013 Whittier Dr")).toBe("Whittier Dr");
    expect(stripHouseNumber("53 Bundesstraße")).toBe("Bundesstraße");
    expect(stripHouseNumber("123 Main St")).toBe("Main St");
  });

  test("preserves ordinal street names", () => {
    expect(stripHouseNumber("1st Ave")).toBe("1st Ave");
    expect(stripHouseNumber("24th St")).toBe("24th St");
  });

  test("preserves highways and numbered routes", () => {
    expect(stripHouseNumber("Route 66")).toBe("Route 66");
    expect(stripHouseNumber("Highway 101")).toBe("Highway 101");
  });

  test("strips trailing house numbers", () => {
    expect(stripHouseNumber("Friedrichstr 237")).toBe("Friedrichstr");
    expect(stripHouseNumber("Schellhorner Str 44")).toBe("Schellhorner Str");
    expect(stripHouseNumber("Schellhorner Str. 44a")).toBe("Schellhorner Str.");
    expect(stripHouseNumber("Am Ringgraben 2")).toBe("Am Ringgraben");
    expect(stripHouseNumber("Багрицкого 10")).toBe("Багрицкого");
    expect(stripHouseNumber("Полярников 6")).toBe("Полярников");
  });

  test("returns empty string if segment is solely a number or punctuation", () => {
    expect(stripHouseNumber("2")).toBe("");
    expect(stripHouseNumber("44a")).toBe("");
    expect(stripHouseNumber(", ")).toBe("");
  });
});

describe("standardizeDisplayAddress", () => {
  test("sanitizes German address and strips building, floor, buzzer, zip, and duplicate city", () => {
    const raw = "Friedrichstr 237, Klingeln Bei HOFMANN , Vorderhaus 5. Stock, Berlin, Berlin , 10969, Deutschland ";
    const clean = standardizeDisplayAddress(raw);
    expect(clean).toBe("Friedrichstr, Berlin, Deutschland");
    expect(clean).not.toContain("237");
    expect(clean).not.toContain("HOFMANN");
    expect(clean).not.toContain("Stock");
    expect(clean).not.toContain("10969");
  });

  test("sanitizes German address with spacing and postal code", () => {
    const raw = "Benderstr , Düsseldorf , 40629, Deutschland ";
    expect(standardizeDisplayAddress(raw)).toBe("Benderstr, Düsseldorf, Deutschland");
  });

  test("sanitizes German address with isolated house number and lowercase region", () => {
    const raw = "Am Ringgraben , 2, paderborn , nordrhein westfalen , 33104, Deutschland";
    expect(standardizeDisplayAddress(raw)).toBe("Am Ringgraben, Paderborn, Nordrhein Westfalen, Deutschland");
  });

  test("sanitizes US address, stripping leading house number and ZIP", () => {
    const raw = "2013 Whittier Dr, Davis, CA 95618, USA";
    expect(standardizeDisplayAddress(raw)).toBe("Whittier Dr, Davis, CA, USA");
  });

  test("normalizes US abbreviation and strips apartment unit", () => {
    const raw = "2746 N Milwaukee Ave, Apt 4B, Chicago, IL 60647, US";
    expect(standardizeDisplayAddress(raw)).toBe("N Milwaukee Ave, Chicago, IL, USA");
  });

  test("sanitizes address with newlines", () => {
    const raw = "5469 Huntington Dr N\nLos Angeles, CA 90032";
    expect(standardizeDisplayAddress(raw)).toBe("Huntington Dr N, Los Angeles, CA");
  });

  test("sanitizes UK address and removes postcode", () => {
    const raw = "The Lantern, Meadow Farm Drive, Shrewsbury, SY1 4NG";
    expect(standardizeDisplayAddress(raw)).toBe("The Lantern, Meadow Farm Drive, Shrewsbury");
  });

  test("sanitizes Russian address and normalizes спб abbreviation while stripping house and flat", () => {
    const raw = "спб, полярников 6, кв 45";
    const clean = standardizeDisplayAddress(raw);
    expect(clean).toBe("Санкт-Петербург, Полярников");
    expect(clean).not.toContain("6");
    expect(clean).not.toContain("45");
  });

  test("sanitizes Russian address with corpus", () => {
    const raw = "Москва, Багрицкого 10 корп 2";
    const clean = standardizeDisplayAddress(raw);
    expect(clean).toBe("Москва, Багрицкого");
    expect(clean).not.toContain("10");
    expect(clean).not.toContain("2");
  });

  test("sanitizes Turkish address, stripping postal code and deduplicating repeated city", () => {
    const raw = "Filan, Falan, Ankara, Ankara, 633333, Türkiye";
    expect(standardizeDisplayAddress(raw)).toBe("Filan, Falan, Ankara, Türkiye");
  });

  test("sanitizes Brazilian address, stripping house number and CEP", () => {
    const raw = "R. Vinte e Quatro, 3027 - Centro, Jales - SP, 15700-115, Brazil";
    expect(standardizeDisplayAddress(raw)).toBe("R. Vinte e Quatro, Centro, Jales - SP, Brazil");
  });

  test("handles null or undefined safely", () => {
    expect(standardizeDisplayAddress(null)).toBe("");
    expect(standardizeDisplayAddress(undefined)).toBe("");
    expect(standardizeDisplayAddress("")).toBe("");
  });
});
