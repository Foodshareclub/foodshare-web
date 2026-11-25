import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useLocationResolver } from "@/hooks/useLocationResolver";
import { useUIStore } from "@/store/zustand/useUIStore";

const SACRAMENTO_IP = {
  latitude: 38.581571,
  longitude: -121.494428,
  city: "Sacramento",
  country: "US",
  source: "ip" as const,
  approximate: true,
};

const SACRAMENTO_GPS = {
  latitude: 38.575,
  longitude: -121.485,
  accuracy: 15,
};

describe("useLocationResolver", () => {
  const originalFetch = globalThis.fetch;
  const originalPermissions = navigator.permissions;
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    useUIStore.setState({ userLocation: null });
    document.cookie = "user-location=; path=/; max-age=0";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(navigator, "permissions", {
      value: originalPermissions,
      configurable: true,
    });
    Object.defineProperty(navigator, "geolocation", {
      value: originalGeolocation,
      configurable: true,
    });
  });

  it("evicts legacy Berlin initialLocation and resolves dynamic Sacramento IP when permission is denied", async () => {
    const getCurrentPositionMock = mock(() => {});

    Object.defineProperty(navigator, "permissions", {
      value: {
        query: async () => ({
          state: "denied",
          onchange: null,
        }),
      },
      configurable: true,
    });

    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
    });

    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ success: true, location: SACRAMENTO_IP }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useLocationResolver({
        initialLocation: {
          latitude: 52.52,
          longitude: 13.405,
          city: "Berlin",
          source: "ip",
          approximate: true,
        },
        autoResolve: true,
      }),
    );

    // Must never trust legacy Berlin coordinates even synchronously on mount
    expect(result.current.location).toBeNull();

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.location?.city).toBe("Sacramento");
    });

    expect(result.current.location?.latitude).toBe(SACRAMENTO_IP.latitude);
    expect(result.current.isApproximate).toBe(true);
    // Must not nag user with getCurrentPosition when denied
    expect(getCurrentPositionMock).not.toHaveBeenCalled();
  });

  it("resolves IP approximation in parallel while prompting for GPS, and upgrades when GPS grants", async () => {
    let gpsSuccessCb: PositionCallback | null = null;
    const getCurrentPositionMock = mock((success: PositionCallback) => {
      gpsSuccessCb = success;
    });

    Object.defineProperty(navigator, "permissions", {
      value: {
        query: async () => ({
          state: "prompt",
          onchange: null,
        }),
      },
      configurable: true,
    });

    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
    });

    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ success: true, location: SACRAMENTO_IP }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useLocationResolver({ autoResolve: true }));

    // 1. Prompt triggered AND IP approximation renders immediately while user decides
    await waitFor(() => {
      expect(getCurrentPositionMock).toHaveBeenCalledTimes(1);
      expect(result.current.location?.city).toBe("Sacramento");
      expect(result.current.isApproximate).toBe(true);
    });

    // 2. User grants permission -> seamlessly upgrades to exact GPS
    await act(async () => {
      gpsSuccessCb?.({
        coords: SACRAMENTO_GPS as GeolocationCoordinates,
        timestamp: Date.now(),
      } as GeolocationPosition);
    });

    await waitFor(() => {
      expect(result.current.location?.latitude).toBe(SACRAMENTO_GPS.latitude);
      expect(result.current.location?.source).toBe("gps");
      expect(result.current.isApproximate).toBe(false);
    });
  });

  it("does not allow a slow IP lookup to overwrite an already-acquired GPS coordinate", async () => {
    let resolveDelayedIp: ((res: Response) => void) | null = null;

    Object.defineProperty(navigator, "permissions", {
      value: {
        query: async () => ({
          state: "prompt",
          onchange: null,
        }),
      },
      configurable: true,
    });

    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          // GPS resolves immediately
          success({
            coords: SACRAMENTO_GPS as GeolocationCoordinates,
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
      configurable: true,
    });

    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          resolveDelayedIp = resolve;
        }),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useLocationResolver({ autoResolve: true }));

    await waitFor(() => {
      expect(result.current.location?.latitude).toBe(SACRAMENTO_GPS.latitude);
      expect(result.current.location?.source).toBe("gps");
    });

    // Now the slower IP lookup finally resolves
    await act(async () => {
      resolveDelayedIp?.(
        new Response(JSON.stringify({ success: true, location: SACRAMENTO_IP }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      await Promise.resolve();
    });

    // Exact GPS coordinates MUST remain intact
    expect(result.current.location?.latitude).toBe(SACRAMENTO_GPS.latitude);
    expect(result.current.location?.source).toBe("gps");
    expect(result.current.isApproximate).toBe(false);
  });
});
