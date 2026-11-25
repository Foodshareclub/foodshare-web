import { describe, expect, it } from "bun:test";
import { normalizeLongitudeBoxes } from "@/components/leaflet/ViewportLoader";

describe("ViewportLoader bounds normalization (Zoom In / Zoom Out Robustness)", () => {
  it("preserves standard bounding boxes within [-180, 180]", () => {
    expect(normalizeLongitudeBoxes(-121.6, -121.3)).toEqual([{ west: -121.6, east: -121.3 }]);
  });

  it("clamps world min-zoom spans >= 360 deg to full [-180, 180]", () => {
    expect(normalizeLongitudeBoxes(-260, 140)).toEqual([{ west: -180, east: 180 }]);
    expect(normalizeLongitudeBoxes(-180, 180)).toEqual([{ west: -180, east: 180 }]);
  });

  it("normalizes wrapped negative longitudes when zoomed out west of -180", () => {
    // e.g. zoomed out west over the Pacific: west = -200 (160E), east = -110 (California)
    expect(normalizeLongitudeBoxes(-200, -110)).toEqual([
      { west: 160, east: 180 },
      { west: -180, east: -110 },
    ]);
  });

  it("normalizes boxes shifted wholly west of -180 instead of collapsing to zero width", () => {
    // Previously clamping both to -180 yielded [-180, -180] (0 width -> 0 items!)
    expect(normalizeLongitudeBoxes(-210, -190)).toEqual([{ west: 150, east: 170 }]);
  });

  it("normalizes boxes shifted wholly east of +180", () => {
    expect(normalizeLongitudeBoxes(190, 210)).toEqual([{ west: -170, east: -150 }]);
  });

  it("falls back safely to [-180, 180] on non-finite coordinates", () => {
    expect(normalizeLongitudeBoxes(Number.NaN, 10)).toEqual([{ west: -180, east: 180 }]);
  });
});
