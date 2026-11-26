/**
 * Evaluates a listing's stored weekly hours at a given instant.
 *
 * The schedule is stored per weekday as wall-clock times ("09:00".."17:00"),
 * with an end before the start meaning the span crosses midnight. The instant
 * is rendered into the listing's own IANA timezone, never the server's or the
 * viewer's, so a fridge in Los Angeles reads correctly from anywhere.
 *
 * Anything malformed or missing returns `unknown`: the UI must show "Hours
 * unavailable" rather than infer open or closed.
 */

export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type HoursInterval = { start: string; end: string };
export type WeeklyHours = Record<Day, HoursInterval[]>;

export type OpenState = { kind: "open" } | { kind: "closed" } | { kind: "opens_at"; at: string } | { kind: "unknown" };

const DAYS: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(value: string, isEnd: boolean): number | null {
  if (value === "24:00") return isEnd ? 1440 : null;
  const match = CLOCK.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Returns a validated copy, or null when any part cannot be trusted. */
function readSchedule(value: unknown): WeeklyHours | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const schedule = {} as WeeklyHours;
  for (const day of DAYS) {
    const intervals = source[day];
    if (!Array.isArray(intervals)) return null;
    const parsed: HoursInterval[] = [];
    for (const interval of intervals) {
      if (!interval || typeof interval !== "object") return null;
      const { start, end } = interval as { start?: unknown; end?: unknown };
      if (typeof start !== "string" || typeof end !== "string") return null;
      const startMinutes = toMinutes(start, false);
      const endMinutes = toMinutes(end, true);
      if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return null;
      parsed.push({ start, end });
    }
    schedule[day] = parsed;
  }
  return schedule;
}

function zonedNow(now: Date, timezone: string): { day: Day; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const weekday = parts.find((part) => part.type === "weekday")?.value;
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    const index = WEEKDAY_NAMES.indexOf(weekday ?? "");
    if (index < 0 || !Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    return { day: DAYS[(index + 6) % 7], minutes: hour * 60 + minute };
  } catch {
    return null;
  }
}

/**
 * @param hours stored schedule, or null/undefined when unknown
 * @param timezone IANA zone of the listing
 * @param now the instant to evaluate (explicit so tests can pin the clock)
 */
export function evaluateOpenState(
  hours: WeeklyHours | null | undefined,
  timezone: string | null | undefined,
  now: Date,
): OpenState {
  if (!timezone || !(now instanceof Date) || Number.isNaN(now.getTime())) return { kind: "unknown" };
  const schedule = readSchedule(hours);
  if (!schedule) return { kind: "unknown" };
  const zoned = zonedNow(now, timezone);
  if (!zoned) return { kind: "unknown" };

  const todayIndex = DAYS.indexOf(zoned.day);
  const yesterday = DAYS[(todayIndex + 6) % 7];

  for (const interval of schedule[zoned.day]) {
    const start = toMinutes(interval.start, false) as number;
    const end = toMinutes(interval.end, true) as number;
    if (start < end) {
      if (zoned.minutes >= start && zoned.minutes < end) return { kind: "open" };
    } else if (zoned.minutes >= start) {
      return { kind: "open" };
    }
  }

  // A span from yesterday that crossed midnight still covers this moment.
  for (const interval of schedule[yesterday]) {
    const start = toMinutes(interval.start, false) as number;
    const end = toMinutes(interval.end, true) as number;
    if (start > end && zoned.minutes < end) return { kind: "open" };
  }

  let next: number | null = null;
  for (const interval of schedule[zoned.day]) {
    const start = toMinutes(interval.start, false) as number;
    if (start > zoned.minutes && (next === null || start < next)) next = start;
  }
  if (next !== null) {
    const hh = String(Math.floor(next / 60)).padStart(2, "0");
    const mm = String(next % 60).padStart(2, "0");
    return { kind: "opens_at", at: `${hh}:${mm}` };
  }
  return { kind: "closed" };
}

/** "09:00" -> "9 AM", "17:30" -> "5:30 PM". */
export function formatClock(value: string): string {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${display} ${suffix}` : `${display}:${String(minute).padStart(2, "0")} ${suffix}`;
}
