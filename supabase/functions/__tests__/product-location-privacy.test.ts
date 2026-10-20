import { assertEquals } from "./test-utils.ts";
import { fuzzProductCoordinates } from "../api-v1-products/lib/location-fuzzer.ts";

const product = {
  id: 42,
  profile_id: "owner",
  latitude: 38,
  longitude: -121,
  post_address: "10 Private Street",
  post_stripped_address: "Sacramento",
  location: "exact-postgis-point",
  location_json: { type: "Point", coordinates: [-121, 38] },
};

Deno.test("public products redact pickup address and every exact coordinate representation", () => {
  const guest = fuzzProductCoordinates(product, null);
  const member = fuzzProductCoordinates(product, "another-member");
  assertEquals(guest.post_address, "Sacramento");
  assertEquals(guest.location, null);
  assertEquals(guest.coordinates_approximate, true);
  assertEquals(guest.latitude === product.latitude, false);
  assertEquals(guest.location_json, {
    type: "Point",
    coordinates: [guest.longitude, guest.latitude],
  });
  assertEquals(member, guest);
  assertEquals(product.post_address, "10 Private Street");
});

Deno.test("missing scalar coordinates cannot expose an exact alternate point or street address", () => {
  const result = fuzzProductCoordinates(
    { ...product, latitude: null, post_stripped_address: null },
    null,
  );
  assertEquals(result.post_address, null);
  assertEquals(result.location, null);
  assertEquals(result.location_json, null);
  assertEquals(result.latitude, null);
  assertEquals(result.longitude, null);
});

Deno.test("authenticated owner keeps exact pickup data without mutating the cached product", () => {
  const result = fuzzProductCoordinates(product, "owner");
  assertEquals(result.post_address, product.post_address);
  assertEquals(result.latitude, product.latitude);
  assertEquals(result.longitude, product.longitude);
  assertEquals(result.location, product.location);
  assertEquals(result.location_json, product.location_json);
  assertEquals(result.coordinates_approximate, false);
  assertEquals(product.location_json.coordinates, [-121, 38]);
});
