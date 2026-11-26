/**
 * Partner fridge sync: read-only client and record mapping.
 *
 * The client can only issue GET requests to the configured base and table, and
 * an error never carries the token. The mapper projects no contact field.
 */
import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  type AirtableConfig,
  assertAllowedUrl,
  fetchRecords,
  recordsUrl,
} from "../_shared/partner-sync/airtable.ts";
import { coordinates, mapRecord } from "../_shared/partner-sync/mapper.ts";

const config: AirtableConfig = {
  token: "test-token-value",
  baseId: "appTESTBASE000001",
  tableId: "tblTESTTABLE0001",
};

Deno.test("pages through records with GET on the configured base only", async () => {
  const calls: Array<{ url: string; method?: string; auth: string | null }> = [];
  const pages = [
    { records: [{ id: "rec1", fields: { Name: "One" } }, { id: "rec2", fields: { Name: "Two" } }], offset: "next" },
    { records: [{ id: "rec3", fields: { Name: "Three" } }] },
  ];
  const fake = (input: string | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method,
      auth: new Headers(init?.headers).get("authorization"),
    });
    return Promise.resolve(Response.json(pages[calls.length - 1]));
  };
  const records = await fetchRecords(config, fake);
  assertEquals(records.map((record) => record.id), ["rec1", "rec2", "rec3"]);
  assertEquals(calls.length, 2);
  assert(calls.every((call) => call.method === "GET"));
  assert(calls[0].url.startsWith(`https://api.airtable.com/v0/${config.baseId}/${config.tableId}`));
  assert(calls[1].url.includes("offset=next"));
  assertEquals(calls[0].auth, `Bearer ${config.token}`);
});

Deno.test("backs off on 429 and then succeeds", async () => {
  let attempts = 0;
  const fake = () => {
    attempts += 1;
    if (attempts === 1) {
      return Promise.resolve(
        new Response("", { status: 429, headers: { "retry-after": "0" } }),
      );
    }
    return Promise.resolve(Response.json({ records: [{ id: "recA", fields: {} }] }));
  };
  const records = await fetchRecords(config, fake);
  assertEquals(attempts, 2);
  assertEquals(records.length, 1);
});

Deno.test("refuses any other base or host", () => {
  assertThrows(() =>
    assertAllowedUrl(new URL("https://api.airtable.com/v0/appOTHERBASE00/tblTESTTABLE0001"), config)
  );
  assertThrows(() => assertAllowedUrl(new URL("http://api.airtable.com/v0/appTESTBASE000001/tblTESTTABLE0001"), config));
  assertThrows(() => assertAllowedUrl(new URL("https://example.org/v0/appTESTBASE000001/tblTESTTABLE0001"), config));
});

Deno.test("an error carries the status, never the token", async () => {
  const fake = () => Promise.resolve(new Response("nope", { status: 401 }));
  try {
    await fetchRecords(config, fake);
    throw new Error("the client accepted a failing response");
  } catch (error) {
    const message = String(error);
    assert(message.includes("401"));
    assert(!message.includes(config.token));
    assert(!message.includes(config.baseId));
  }
});

Deno.test("maps every public field and never a contact field", () => {
  const row = mapRecord({
    id: "recA",
    fields: {
      Name: "  Sunrise Fridge  ",
      Status: "Active",
      "Street address": "123 Main St",
      City: "Los Angeles",
      Latitude: "34.0522",
      Longitude: "-118.2437",
      Hours: "9-5",
      "Pantry?": "Pantry available",
      "Location type": "Outside",
      "Host Company": "Corner Shop",
      "Company type": "market",
      Languages: ["English", "Spanish"],
      "Instagram handle (no @)": "sunrisefridge",
      "Total check-ins": 42,
      Photo: [{ url: "https://example.org/photo.jpg" }],
      "Point person email": "private@example.org",
      "Point person phone": "+15550000000",
      "Slack channel link": "https://slack.example.org/private",
    },
  });
  assert(row);
  assertEquals(row.post_name, "Sunrise Fridge");
  assertEquals(row.partner_status, "Active");
  assertEquals(row.post_address, "123 Main St, Los Angeles");
  assertEquals(row.latitude, 34.0522);
  assertEquals(row.longitude, -118.2437);
  assertEquals(row.has_pantry, true);
  assertEquals(row.metadata.lacf.host_company, "Corner Shop");
  assertEquals(row.metadata.lacf.languages, ["English", "Spanish"]);
  assertEquals(row.metadata.lacf.has_photo, true);
  assertEquals(row.metadata.lacf.total_check_ins, 42);
  const publicJson = JSON.stringify(row.metadata);
  assert(!publicJson.includes("private@example.org"));
  assert(!publicJson.includes("Point person"));
  assert(!publicJson.includes("slack.example.org"));
});

Deno.test("keeps a blank status, falls back for coordinates, skips a nameless record", () => {
  const blank = mapRecord({
    id: "recB",
    fields: { Name: "Blank Fridge", "Full Latitude Longitude": "34.05, -118.24" },
  });
  assert(blank);
  assertEquals(blank.partner_status, null);
  assertEquals(blank.latitude, 34.05);
  assertEquals(blank.longitude, -118.24);
  assertEquals(blank.post_address, "");
  assertEquals(mapRecord({ id: "recC", fields: { Status: "Active" } }), null);
  assertEquals(coordinates({ Latitude: "999", Longitude: "0" }), { latitude: null, longitude: null });
  assertEquals(recordsUrl(config, "abc").searchParams.get("offset"), "abc");
});
