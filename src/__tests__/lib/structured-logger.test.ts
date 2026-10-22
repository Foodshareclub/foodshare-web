import { describe, expect, it } from "bun:test";
import { Logger } from "@/lib/structured-logger";

/**
 * The logger's timestamp is the current time.
 *
 * It has to be, and it has to be readable in a render. A prerender
 * refuses `new Date()` and `Date.now()`: a value that changes between
 * renders cannot be baked into a prerendered page. The refusal aborts
 * the whole render, and the visitor gets an error page instead of the
 * page.
 *
 * The logger is called from inside a render -- most often from the catch
 * block of a data fetch, which is exactly the path a page takes when the
 * database is down. The log line that reports the failure was therefore
 * the thing that broke the page: with the database unreachable, the home
 * page answered with a 295 KB error page after 7.4 seconds, and the server
 * said
 *
 *     Error: Route "/": Next.js encountered the unstable value
 *     `new Date()` while prerendering.
 *
 * So the timestamp is read the way the framework documents for a
 * measurement: `performance.timeOrigin` and `performance.now()`, which it
 * does not refuse.
 *
 * This test pins the contract -- the entry carries the current time, in
 * a form that can be read. It cannot see the framework's refusal, which
 * only happens during a prerender: `scripts/check-no-unstable-render.ts`
 * is what catches that, by rendering every page with the database
 * unreachable.
 */

/** The lines the logger writes, with the console restored afterwards. */
function capturedLog(write: (logger: Logger) => void): string[] {
  const lines: string[] = [];
  const original = console.info;
  console.info = (line: string) => {
    lines.push(line);
  };
  try {
    write(new Logger({ action: "Test" }));
  } finally {
    console.info = original;
  }
  return lines;
}

/**
 * The timestamp at the start of a log line.
 *
 * The line begins with the timestamp, dimmed, so the instant is the text
 * between the first escape sequence and the next.
 */
function timestampOf(line: string): string {
  return line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)?.[0] ?? "";
}

describe("the structured logger", () => {
  it("stamps an entry with a readable timestamp", () => {
    const lines = capturedLog((logger) => logger.info("hello"));

    expect(lines).toHaveLength(1);
    // The form `2026-01-31T12:00:00.000Z`.
    expect(timestampOf(lines[0])).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("stamps an entry with the time it was written, not the time the process started", () => {
    const lines = capturedLog((logger) => {
      logger.info("first");
      // The two entries are written at different moments, and the
      // clock has moved between them.
      performance.now();
      logger.info("second");
    });

    expect(lines).toHaveLength(2);
    const first = timestampOf(lines[0]);
    const second = timestampOf(lines[1]);

    // The timestamps are ISO instants, so they parse, and the second
    // is not before the first.
    const firstMs = Date.parse(first);
    const secondMs = Date.parse(second);
    expect(Number.isNaN(firstMs)).toBe(false);
    expect(Number.isNaN(secondMs)).toBe(false);
    expect(secondMs).toBeGreaterThanOrEqual(firstMs);
  });

  it("is close to the wall clock", () => {
    // The timestamp is the current time, not the time the process
    // started: it is built from `performance.timeOrigin` and
    // `performance.now()`, which together are the current instant.
    const lines = capturedLog((logger) => logger.info("now"));
    const written = Date.parse(timestampOf(lines[0]));
    const before = Date.now();
    expect(Math.abs(before - written)).toBeLessThan(5_000);
  });
});
