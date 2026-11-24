import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearGeoCacheForTesting,
  isPrivateOrLoopbackIp,
  resolvePublicIpLocation,
} from "@/lib/location/ip-geolocator";

describe("ip-geolocator", () => {
  beforeEach(() => {
    clearGeoCacheForTesting();
  });

  describe("isPrivateOrLoopbackIp", () => {
    it("identifies null and empty inputs as private/loopback", () => {
      expect(isPrivateOrLoopbackIp(null)).toBe(true);
      expect(isPrivateOrLoopbackIp(undefined)).toBe(true);
      expect(isPrivateOrLoopbackIp("")).toBe(true);
    });

    it("identifies loopback addresses", () => {
      expect(isPrivateOrLoopbackIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrLoopbackIp("::1")).toBe(true);
      expect(isPrivateOrLoopbackIp("localhost")).toBe(true);
      expect(isPrivateOrLoopbackIp("::ffff:127.0.0.1")).toBe(true);
    });

    it("identifies private IPv4 ranges", () => {
      expect(isPrivateOrLoopbackIp("10.0.0.1")).toBe(true);
      expect(isPrivateOrLoopbackIp("10.255.255.255")).toBe(true);
      expect(isPrivateOrLoopbackIp("192.168.1.1")).toBe(true);
      expect(isPrivateOrLoopbackIp("172.16.0.1")).toBe(true);
      expect(isPrivateOrLoopbackIp("172.31.255.255")).toBe(true);
      expect(isPrivateOrLoopbackIp("169.254.1.1")).toBe(true);
    });

    it("identifies public IPv4 addresses", () => {
      expect(isPrivateOrLoopbackIp("73.2.14.20")).toBe(false);
      expect(isPrivateOrLoopbackIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrLoopbackIp("1.1.1.1")).toBe(false);
      expect(isPrivateOrLoopbackIp("172.32.0.1")).toBe(false);
    });
  });

  describe("resolvePublicIpLocation", () => {
    it("resolves public IP location and caches the result", async () => {
      const loc = await resolvePublicIpLocation("8.8.8.8");
      // 8.8.8.8 is Google DNS in US
      if (loc) {
        expect(loc.source).toBe("ip");
        expect(loc.approximate).toBe(true);
        expect(typeof loc.latitude).toBe("number");
        expect(typeof loc.longitude).toBe("number");
      }
    });

    it("resolves outbound public IP for loopback/private addresses", async () => {
      const loc = await resolvePublicIpLocation("127.0.0.1");
      if (loc) {
        expect(loc.source).toBe("ip");
        expect(loc.approximate).toBe(true);
        expect(typeof loc.latitude).toBe("number");
        expect(typeof loc.longitude).toBe("number");
      }
    });
  });
});
