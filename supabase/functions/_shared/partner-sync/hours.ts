/**
 * Turns a partner's free-text Hours field into a per-weekday schedule.
 *
 * The field is free text, so this parser is deliberately conservative: a
 * clause it cannot read with confidence makes the whole value unknown (null)
 * rather than guessing. Unknown hours render as "Hours unavailable" and are
 * never treated as open or closed.
 *
 * Supported, case-insensitively:
 *   - day specs: daily, weekdays, weekends, Mon-Fri, Mon, Wed, Fri, a single day
 *   - times: 9am-5pm, 9:00 AM - 5:00 PM, 18:00-02:00, 9-5 (unambiguous only)
 *   - overnight spans (end before start) and 24/7 / 24 hours
 *   - "closed" for the specified days
 * Several clauses may be separated by ";" or a newline.
 *
 * @module _shared/partner-sync/hours
 */

export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type HoursInterval = { start: string; end: string };
export type WeeklyHours = Record<Day, HoursInterval[]>;

export const DAYS: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DAY_INDEX: Record<string, number> = {
  mon: 0,
  monday: 0,
  mondays: 0,
  tue: 1,
  tues: 1,
  tuesdays: 1,
  tuesday: 1,
  wed: 2,
  weds: 2,
  wednesday: 2,
  wednesdays: 2,
  thu: 3,
  thur: 3,
  thurs: 3,
  thursday: 3,
  thursdays: 3,
  fri: 4,
  fridays: 4,
  friday: 4,
  sat: 5,
  saturday: 5,
  saturdays: 5,
  sun: 6,
  sunday: 6,
  sundays: 6,
};

const DAY_TOKEN =
  "(mon(?:day)?s?|tue(?:sday)?s?|tues|wed(?:nesday)?s?|thu(?:rsday|rs|r)?s?|fri(?:day)?s?|sat(?:urday)?s?|sun(?:day)?s?)";
const RANGE_RE = new RegExp(`^${DAY_TOKEN}\\s*-\\s*${DAY_TOKEN}\\b`);
const LIST_RE = new RegExp(`^${DAY_TOKEN}(?:\\s*(?:,|&|and|\\/)\\s*${DAY_TOKEN})+\\b`);
const SINGLE_RE = new RegExp(`^${DAY_TOKEN}\\b`);

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function normalize(value: string): string {
  return value
    .replace(/[–—−]/g, "-")
    .replace(/\b(to|through)\b/g, "-")
    .replace(/\ba\.?m\.?\b/g, "am")
    .replace(/\bp\.?m\.?\b/g, "pm")
    .replace(/\bnoon\b/g, "12pm")
    .replace(/\bmidnight\b/g, "12am")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function clock(hour: number, minute: number, meridiem?: string): number | null {
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return null;
  }
  if (meridiem === "am") {
    if (hour < 1 || hour > 12) return null;
    return (hour % 12) * 60 + minute;
  }
  if (meridiem === "pm") {
    if (hour < 1 || hour > 12) return null;
    return (hour === 12 ? 12 : hour + 12) * 60 + minute;
  }
  if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}

const pad = (n: number) => String(n).padStart(2, "0");
const format = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

function parseDays(spec: string): Day[] | null {
  const range = spec.match(RANGE_RE);
  if (range) {
    const from = DAY_INDEX[range[1]];
    const to = DAY_INDEX[range[2]];
    if (from === undefined || to === undefined) return null;
    const days: Day[] = [];
    for (let i = from;; i = (i + 1) % 7) {
      days.push(DAYS[i]);
      if (i === to) break;
      if (days.length > 7) return null;
    }
    return days;
  }
  const list = spec.match(LIST_RE);
  if (list) {
    const days = [...list[0].matchAll(new RegExp(DAY_TOKEN, "g"))]
      .map((m) => DAY_INDEX[m[1]])
      .filter((i): i is number => i !== undefined);
    return [...new Set(days.map((i) => DAYS[i]))];
  }
  const single = spec.match(SINGLE_RE);
  if (single) {
    const index = DAY_INDEX[single[1]];
    return index === undefined ? null : [DAYS[index]];
  }
  return null;
}

function parseInterval(part: string): { start: number; end: number } | null {
  const match = part.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/,
  );
  if (!match) return null;
  const h1 = Number(match[1]);
  const m1 = match[2] ? Number(match[2]) : 0;
  const mer1 = match[3];
  const h2 = Number(match[4]);
  const m2 = match[5] ? Number(match[5]) : 0;
  const mer2 = match[6];

  let start = clock(h1, m1, mer1);
  let end = clock(h2, m2, mer2);
  if (start === null || end === null) return null;

  if (!mer1 && !mer2) {
    if (h1 > 12 || h2 > 12) {
      // Already 24-hour; the clock values stand.
    } else if (h1 === 12 && h2 !== 12) {
      // 12-2 is noon to 2pm; a midnight start would be written 12am.
      start = clock(h1, m1, "pm");
      end = clock(h2, m2, "pm");
    } else if (h2 === 12 && h1 !== 12) {
      end = clock(h2, m2, "pm");
    } else if (h1 >= h2) {
      // 9-5, 10-2, 11-3: the common daytime convention.
      start = clock(h1, m1, "am");
      end = clock(h2, m2, "pm");
    } else {
      // 7-9 and 9-11 are genuinely ambiguous.
      return null;
    }
  } else if (!mer1) {
    if (h1 === 12) return null;
    const am = clock(h1, m1, "am");
    const pm = clock(h1, m1, "pm");
    start = am !== null && am < end ? am : pm;
  } else if (!mer2) {
    if (h2 === 12) return null;
    const am = clock(h2, m2, "am");
    const pm = clock(h2, m2, "pm");
    end = am !== null && am > start ? am : pm;
  }

  if (start === null || end === null || start === end) return null;
  if (end === 0 && start > 0) end = 1440;
  if (start < 0 || start >= 1440 || end < 0 || end > 1440) return null;
  return { start, end };
}

function stripLead(value: string): string {
  return value.replace(/^[\s:,-]+/, "").trim();
}

function parseClause(clause: string): Partial<Record<Day, HoursInterval[]>> | null {
  let rest = stripLead(clause);
  if (!rest) return null;
  if (/^(always open|open always)\b/.test(rest)) {
    return Object.fromEntries(DAYS.map((day) => [day, [{ start: "00:00", end: "24:00" }]]));
  }
  rest = stripLead(rest.replace(/^(open|hours)\b/, ""));
  if (!rest) return null;

  let days: Day[] = DAYS;
  if (/^(daily|every ?day|7 days a week|all week)\b/.test(rest)) {
    rest = stripLead(rest.replace(/^(daily|every ?day|7 days a week|all week)\b/, ""));
  } else if (/^weekdays?\b/.test(rest)) {
    days = ["mon", "tue", "wed", "thu", "fri"];
    rest = stripLead(rest.replace(/^weekdays?\b/, ""));
  } else if (/^weekends?\b/.test(rest)) {
    days = ["sat", "sun"];
    rest = stripLead(rest.replace(/^weekends?\b/, ""));
  } else {
    const parsed = parseDays(rest);
    if (parsed) {
      days = parsed;
      const matched = rest.match(RANGE_RE) ?? rest.match(LIST_RE) ?? rest.match(SINGLE_RE);
      rest = stripLead(rest.slice(matched?.[0].length ?? 0));
    }
  }

  rest = stripLead(rest.replace(/^(from|open|hours)\b/, ""));
  if (!rest) return null;

  if (/^(closed|not open)\b/.test(rest)) {
    return Object.fromEntries(days.map((day) => [day, []]));
  }
  if (/^(24\/7|24 hours|24hrs?|all day)\b/.test(rest)) {
    return Object.fromEntries(days.map((day) => [day, [{ start: "00:00", end: "24:00" }]]));
  }

  const interval = parseInterval(rest);
  if (!interval) return null;
  const value = [{ start: format(interval.start), end: format(interval.end) }];
  return Object.fromEntries(days.map((day) => [day, value]));
}

export function parseOpeningHours(value: unknown): WeeklyHours | null {
  const raw = text(value);
  if (!raw) return null;
  const clauses = normalize(raw).split(/[;\n]+/).map((part) => part.trim()).filter(Boolean);
  if (clauses.length === 0) return null;

  const result: WeeklyHours = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
  const merge = (parsed: Partial<Record<Day, HoursInterval[]>>) => {
    for (const day of DAYS) {
      if (parsed[day]) result[day] = parsed[day] as HoursInterval[];
    }
  };
  for (const clause of clauses) {
    const parsed = parseClause(clause);
    if (parsed) {
      merge(parsed);
      continue;
    }
    // A comma may separate day clauses ("Mon-Fri 9-5, Sat 10-2") or a day list
    // ("Mon, Wed, Fri 9-5"). Only split when every part starts with a day spec;
    // otherwise the comma is ambiguous and the value stays unknown.
    const parts = clause.split(",").map((part) => part.trim()).filter(Boolean);
    const everyPartHasDays = parts.length > 1 &&
      parts.every((part) =>
        /^(daily|every|weekdays?|weekends?|mon|tue|wed|thu|fri|sat|sun)/.test(part)
      );
    if (!everyPartHasDays) return null;
    for (const part of parts) {
      const sub = parseClause(part);
      if (!sub) return null;
      merge(sub);
    }
  }
  for (const day of DAYS) {
    result[day].sort((a, b) => a.start.localeCompare(b.start));
  }
  return result;
}
