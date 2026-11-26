import { assertEquals } from "@std/assert";
import { inspectRecords } from "../_shared/partner-sync/validate.ts";

const record = (fields: Record<string, unknown>) => ({ id: "rec", fields });

Deno.test("a healthy base passes without warnings", () => {
  const shape = inspectRecords([
    record({
      Name: "A",
      Status: "Active",
      "Street address": "1 Main St",
      Hours: "Mon-Fri 9am-5pm",
    }),
    record({ Name: "B", Status: "On hold", "Street address": "2 Main St", Hours: "Closed" }),
  ]);
  assertEquals(shape.refused, []);
  assertEquals(shape.warnings, []);
});

Deno.test("a missing Status column refuses the run", () => {
  const shape = inspectRecords([record({ Name: "A", "Street address": "1 Main St" })]);
  assertEquals(shape.refused.includes("Status"), true);
});

Deno.test("a missing Name column refuses the run", () => {
  const shape = inspectRecords([record({ Status: "Active", "Street address": "1 Main St" })]);
  assertEquals(shape.refused.includes("Name"), true);
});

Deno.test("a changed status vocabulary refuses the run", () => {
  const shape = inspectRecords([
    record({ Name: "A", Status: "Open", "Street address": "1 Main St", Hours: "9am-5pm" }),
    record({ Name: "B", Status: "Closed", "Street address": "2 Main St", Hours: "9am-5pm" }),
  ]);
  assertEquals(shape.refused.includes("Status vocabulary changed"), true);
  assertEquals(shape.warnings.length, 1);
});

Deno.test("one unknown status warns but does not block the known ones", () => {
  const shape = inspectRecords([
    record({ Name: "A", Status: "Active", "Street address": "1 Main St" }),
    record({ Name: "B", Status: "Open", "Street address": "2 Main St" }),
  ]);
  assertEquals(shape.refused, []);
  assertEquals(shape.warnings[0], "Unknown status values: open");
});

Deno.test("unparsable hours warn but never refuse the run", () => {
  const shape = inspectRecords([
    record({ Name: "A", Status: "Active", "Street address": "1 Main St", Hours: "By appointment" }),
    record({
      Name: "B",
      Status: "Active",
      "Street address": "2 Main St",
      Hours: "Mon-Fri 9am-5pm",
    }),
  ]);
  assertEquals(shape.refused, []);
  assertEquals(
    shape.warnings.includes(
      "1 hours value(s) could not be parsed and will show as Hours unavailable",
    ),
    true,
  );
});

Deno.test("no street address anywhere warns", () => {
  const shape = inspectRecords([record({ Name: "A", Status: "Active" })]);
  assertEquals(shape.refused, []);
  assertEquals(shape.warnings.includes("Street address is empty on every record"), true);
});

Deno.test("all-blank statuses warn rather than refuse", () => {
  const shape = inspectRecords([
    record({ Name: "A", Status: "", "Street address": "1 Main St" }),
  ]);
  assertEquals(shape.refused, []);
  assertEquals(shape.warnings.includes("Every record has a blank status"), true);
});
