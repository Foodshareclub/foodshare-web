import { assertEquals } from "@std/assert";
import { parseOpeningHours } from "../_shared/partner-sync/hours.ts";

const span = (start: string, end: string) => [{ start, end }];

Deno.test("a weekday range becomes a per-day schedule", () => {
  const hours = parseOpeningHours("Mon-Fri 9am-5pm");
  assertEquals(hours?.mon, span("09:00", "17:00"));
  assertEquals(hours?.fri, span("09:00", "17:00"));
  assertEquals(hours?.sat, []);
  assertEquals(hours?.sun, []);
});

Deno.test("daily with 12-hour times", () => {
  const hours = parseOpeningHours("Daily 8:00 AM - 8:00 PM");
  for (const day of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const) {
    assertEquals(hours?.[day], span("08:00", "20:00"));
  }
});

Deno.test("24/7 covers every day", () => {
  const hours = parseOpeningHours("Open 24/7");
  assertEquals(hours?.mon, span("00:00", "24:00"));
  assertEquals(hours?.sun, span("00:00", "24:00"));
});

Deno.test("an overnight span keeps the crossing", () => {
  const hours = parseOpeningHours("Sat 18:00-02:00");
  assertEquals(hours?.sat, span("18:00", "02:00"));
  assertEquals(hours?.sun, []);
});

Deno.test("an unambiguous bare range is inferred, an ambiguous one is unknown", () => {
  assertEquals(parseOpeningHours("Mon-Fri 9-5")?.mon, span("09:00", "17:00"));
  assertEquals(parseOpeningHours("Mon 10-2")?.mon, span("10:00", "14:00"));
  assertEquals(parseOpeningHours("Mon 7-9"), null);
});

Deno.test("day lists and weekend specs", () => {
  assertEquals(parseOpeningHours("Mon, Wed, Fri 10am-2pm")?.wed, span("10:00", "14:00"));
  assertEquals(parseOpeningHours("Weekends 10am-2pm")?.sun, span("10:00", "14:00"));
  assertEquals(parseOpeningHours("Weekdays 9am-5pm")?.sat, []);
});

Deno.test("two clauses combine", () => {
  const hours = parseOpeningHours("Mon-Fri 9am-5pm; Sat 10am-2pm");
  assertEquals(hours?.mon, span("09:00", "17:00"));
  assertEquals(hours?.sat, span("10:00", "14:00"));
  assertEquals(hours?.sun, []);
});

Deno.test("common free-text lead-ins and plurals parse", () => {
  assertEquals(parseOpeningHours("Open Mon-Fri 9am-5pm")?.mon, span("09:00", "17:00"));
  assertEquals(parseOpeningHours("Mondays 10am-2pm")?.mon, span("10:00", "14:00"));
  assertEquals(parseOpeningHours("Monday through Friday 9-5")?.fri, span("09:00", "17:00"));
  assertEquals(parseOpeningHours("Always open")?.sun, span("00:00", "24:00"));
  assertEquals(parseOpeningHours("12-2")?.mon, span("12:00", "14:00"));
});

Deno.test("comma-separated day clauses combine; ambiguous commas stay unknown", () => {
  const hours = parseOpeningHours("Mon-Fri 9am-5pm, Sat 10am-2pm");
  assertEquals(hours?.mon, span("09:00", "17:00"));
  assertEquals(hours?.sat, span("10:00", "14:00"));
  assertEquals(parseOpeningHours("9am-5pm, 1pm-9pm"), null);
});

Deno.test("closed is a known empty schedule", () => {
  assertEquals(parseOpeningHours("Closed")?.mon, []);
});

Deno.test("free text without a readable schedule is unknown, never guessed", () => {
  for (
    const value of ["By appointment", "Hours vary", "See Instagram", "Sunrise to sunset", "", null]
  ) {
    assertEquals(parseOpeningHours(value), null);
  }
});
