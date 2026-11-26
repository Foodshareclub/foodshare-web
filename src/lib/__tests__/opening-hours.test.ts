import { describe, expect, it } from "bun:test";
import { evaluateOpenState, formatClock, type WeeklyHours } from "@/lib/opening-hours";

const week = (overrides: Partial<WeeklyHours> = {}): WeeklyHours => ({
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
  ...overrides,
});

describe("evaluateOpenState", () => {
  it("is open inside a normal daytime span", () => {
    const hours = week({ mon: [{ start: "09:00", end: "17:00" }] });
    // 2026-06-01 is a Monday; 19:00Z is 12:00 in Los Angeles.
    expect(evaluateOpenState(hours, "America/Los_Angeles", new Date("2026-06-01T19:00:00Z"))).toEqual({ kind: "open" });
  });

  it("is closed on a day with no span", () => {
    const hours = week({ mon: [] });
    expect(evaluateOpenState(hours, "America/Los_Angeles", new Date("2026-06-01T19:00:00Z"))).toEqual({
      kind: "closed",
    });
  });

  it("stays open after midnight for yesterday's overnight span", () => {
    const hours = week({ sat: [{ start: "18:00", end: "02:00" }] });
    // Sunday 01:30 in Los Angeles, inside Saturday's 18:00-02:00 span.
    expect(evaluateOpenState(hours, "America/Los_Angeles", new Date("2026-06-07T08:30:00Z"))).toEqual({ kind: "open" });
  });

  it("does not extend an overnight span into a later day", () => {
    const hours = week({ sat: [{ start: "18:00", end: "02:00" }] });
    // Monday 01:30: Saturday's span is long over.
    expect(evaluateOpenState(hours, "America/Los_Angeles", new Date("2026-06-08T08:30:00Z"))).toEqual({
      kind: "closed",
    });
  });

  it("uses the listing's timezone, not the test runner's", () => {
    const hours = week({ mon: [{ start: "09:00", end: "17:00" }] });
    // Monday 09:30 in Tokyo.
    expect(evaluateOpenState(hours, "Asia/Tokyo", new Date("2026-06-01T00:30:00Z"))).toEqual({ kind: "open" });
    // Tuesday 00:00 in Tokyo: Monday's span has ended.
    expect(evaluateOpenState(hours, "Asia/Tokyo", new Date("2026-06-01T15:00:00Z"))).toEqual({ kind: "closed" });
  });

  it("handles the spring DST transition in Los Angeles", () => {
    const hours = week({ sun: [{ start: "01:00", end: "02:30" }] });
    // 09:30Z is 01:30 PST, inside the span.
    expect(evaluateOpenState(hours, "America/Los_Angeles", new Date("2026-03-08T09:30:00Z"))).toEqual({ kind: "open" });
    // 10:30Z is 03:30 PDT; the clock jumped over the rest of the span.
    expect(evaluateOpenState(hours, "America/Los_Angeles", new Date("2026-03-08T10:30:00Z"))).toEqual({
      kind: "closed",
    });
  });

  it("reports the next opening time later today", () => {
    const hours = week({ mon: [{ start: "09:00", end: "17:00" }] });
    // Monday 07:00 in Los Angeles.
    expect(evaluateOpenState(hours, "America/Los_Angeles", new Date("2026-06-01T14:00:00Z"))).toEqual({
      kind: "opens_at",
      at: "09:00",
    });
  });

  it("treats the end instant as closed and the start instant as open", () => {
    const hours = week({ mon: [{ start: "09:00", end: "17:00" }] });
    // 16:00Z is 09:00 PDT; 2026-06-02T00:00Z is 17:00 PDT.
    expect(evaluateOpenState(hours, "America/Los_Angeles", new Date("2026-06-01T16:00:00Z"))).toEqual({ kind: "open" });
    expect(evaluateOpenState(hours, "America/Los_Angeles", new Date("2026-06-02T00:00:00Z"))).toEqual({
      kind: "closed",
    });
  });

  it("is unknown, never open or closed, when hours or the zone are missing or malformed", () => {
    const now = new Date("2026-06-01T19:00:00Z");
    expect(evaluateOpenState(null, "America/Los_Angeles", now)).toEqual({ kind: "unknown" });
    expect(evaluateOpenState(week(), null, now)).toEqual({ kind: "unknown" });
    expect(evaluateOpenState(week(), "Not/AZone", now)).toEqual({ kind: "unknown" });
    expect(evaluateOpenState({ mon: [{ start: "9:00", end: "17:00" }] } as never, "America/Los_Angeles", now)).toEqual({
      kind: "unknown",
    });
  });
});

describe("formatClock", () => {
  it("formats whole and partial hours", () => {
    expect(formatClock("09:00")).toBe("9 AM");
    expect(formatClock("17:30")).toBe("5:30 PM");
    expect(formatClock("12:00")).toBe("12 PM");
  });
});
