/**
 * Address Standardization and Privacy Engine
 *
 * Implements privacy-first address formatting:
 * 1. Strips sensitive components across international conventions:
 *    - Building/house numbers (leading, trailing, and hyphenated/suffixed like 14b, 10-A, 10/2)
 *    - Unit, apartment, suite, room, flat, floor, corpus, entrance, and buzzer notes
 *    - Detailed postal/ZIP codes attached to street level
 * 2. Prevents collisions, duplicate tokens, and inconsistencies:
 *    - Repeated city/district tokens (e.g. "Berlin, Berlin" -> "Berlin", "Ankara, Ankara" -> "Ankara")
 *    - Abbreviation normalisation ("спб" -> "Санкт-Петербург", "US" -> "USA")
 * 3. Country-specific address structure awareness (US, DE, UK, RU, IT, FR, BR, TR, etc.)
 */

export interface StandardizedAddressResult {
  original: string;
  displayAddress: string;
  country?: string;
  city?: string;
  streetOrArea?: string;
}

/** Known country names and their canonical forms (note: do NOT map 2-letter state abbreviations like CA) */
const COUNTRY_MAP: Record<string, string> = {
  usa: "USA",
  us: "USA",
  "united states": "USA",
  "united states of america": "USA",
  de: "Deutschland",
  deutschland: "Deutschland",
  germany: "Germany",
  uk: "UK",
  "united kingdom": "UK",
  gb: "UK",
  great_britain: "UK",
  russia: "Россия",
  россия: "Россия",
  рф: "Россия",
  ukraine: "Украина",
  украина: "Украина",
  italy: "Italy",
  italia: "Italy",
  france: "France",
  brazil: "Brazil",
  brasil: "Brazil",
  turkey: "Türkiye",
  türkiye: "Türkiye",
  turkiye: "Türkiye",
  canada: "Canada",
  spain: "Spain",
  españa: "Spain",
  austria: "Austria",
  österreich: "Österreich",
  switzerland: "Switzerland",
  schweiz: "Schweiz",
};

/** Well-known city / region abbreviation normalisations */
const CITY_ABBREVIATIONS: Record<string, string> = {
  спб: "Санкт-Петербург",
  "г. спб": "Санкт-Петербург",
  мск: "Москва",
  "г. мск": "Москва",
  nyc: "New York, NY",
  la: "Los Angeles, CA",
  sf: "San Francisco, CA",
};

/**
 * Patterns matching apartment, flat, unit, room, floor, corpus, or entrance numbers
 * across English, Russian, German, French, Spanish, Portuguese, Italian.
 * Uses Unicode-aware boundary checks since JS \b does not match Cyrillic/accented boundaries.
 */
const SENSITIVE_UNIT_PATTERNS: RegExp[] = [
  // English unit/suite/apt/floor/room
  /(?<!\p{L})(?:apt|apartment|unit|suite|ste|flat|room|rm|floor|fl|bldg|building|lot)\.?\s*#?\s*[0-9a-zA-Z\-_/]+/giu,
  /#\s*[0-9a-zA-Z\-_/]+/gu,

  // Russian / Cyrillic: кв, квартира, корп, корпус, стр, строение, подъезд, этаж, литера
  /(?<!\p{L})(?:кв|кв\.|квартира|комн|комната)\s*[0-9a-zA-Zа-яА-ЯёЁ\-_/]+/giu,
  /(?<!\p{L})(?:корп|корп\.|корпус)\s*[0-9a-zA-Zа-яА-ЯёЁ\-_/]+/giu,
  /(?<!\p{L})(?:стр|стр\.|строение)\s*[0-9a-zA-Zа-яА-ЯёЁ\-_/]+/giu,
  /(?<!\p{L})(?:подъезд|п-д|эт|эт\.|этаж|лит|литера)\s*[0-9a-zA-Zа-яА-ЯёЁ\-_/]+/giu,

  // German: Whg, Wohnung, Haus, Zimmer, Stock, OG, EG, Vorderhaus, Hinterhaus, Klingeln bei
  /(?<!\p{L})(?:whg|wohnung|haus|zimmer|zi|stock|og|eg)\.?\s*[0-9a-zA-Z\-_/]+/giu,
  /\b\d+\.?\s*(?:stock|og|eg)\b/giu,
  /(?<!\p{L})(?:vorderhaus|hinterhaus|seitenflügel)(?!\p{L})/giu,
  /(?<!\p{L})klingeln\s+bei\s+[^,;]+/giu,
  /(?<!\p{L})звонить\s+(?:в\s+)?звонок\s+[^,;]+/giu,

  // French/Spanish/Portuguese/Italian: etage, appt, piso, puerta, andar, bloco, piano, interno, scala
  /(?<!\p{L})(?:etage|appt|porte|piso|puerta|bloque|escalera|andar|bloco|piano|interno|scala)\.?\s*[0-9a-zA-Z\-_/]+/giu,
];

/**
 * Postal / ZIP code patterns:
 * - US 5-digit / 9-digit: 95618, 95618-1234
 * - German / European 5-digit: 10969, 40629, 33104
 * - Russian / Turkish 6-digit: 633333, 101000
 * - Brazil: 15700-115
 * - UK: SY1 4NG, EC1A 1BB
 */
const POSTAL_CODE_PATTERNS: RegExp[] = [
  /\b[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}\b/gi, // UK postcode
  /\b\d{5}-\d{3}\b/g, // Brazil CEP: 15700-115
  /\b\d{5}(?:-\d{4})?\b/g, // US / German 5-digit zip
  /\b\d{6}\b/g, // Russian / Turkish 6-digit postal code
];

/**
 * Strip house/building number from a street token.
 * Handles:
 * - "2013 Whittier Dr" -> "Whittier Dr"
 * - "53 Bundesstraße" -> "Bundesstraße"
 * - "Friedrichstr 237" -> "Friedrichstr"
 * - "Schellhorner Str. 44" -> "Schellhorner Str."
 * - "Schellhorner Str 44a" -> "Schellhorner Str"
 * - "Am Ringgraben 2" -> "Am Ringgraben"
 * - "Багрицкого 10" -> "Багрицкого"
 * - "Полярников 6" -> "Полярников"
 * - "R. Vinte e Quatro, 3027 - Centro" -> "R. Vinte e Quatro, Centro"
 * - "Atatürk Cad. 45" -> "Atatürk Cad."
 * Avoids stripping numbers that are integral parts of named roads,
 * e.g. "Route 66", "A10", "Highway 101", "M4", "I-80", "1st Ave", "24th St".
 */
export function stripHouseNumber(segment: string): string {
  let s = segment.trim();

  // Strip leading dashes or punctuation
  s = s.replace(/^[\s\-–—,./#]+/, "").trim();

  // Strip standalone leading house number (e.g. "2013 Whittier Dr", "53 Bundesstraße")
  // Do NOT match ordinal streets like "1st Ave", "42nd St"
  s = s.replace(/^\d+\s+(?!(?:st|nd|rd|th)\b)/i, "");

  // Check if segment is a highway/route name
  const isHighwayRoute = /^(?:route|highway|interstate|i-|us-|hwy|bundesstraße|a|m|b)\s*\d+$/i.test(s);

  if (!isHighwayRoute) {
    // Strip trailing house numbers with optional letters/slashes/dashes
    // e.g. "Friedrichstr 237", "Str. 44a", "Street 10/2", "Cad. 45-B", "Багрицкого 10"
    s = s.replace(/(?:,\s*|-\s*)?\b\d+[\s\-_/]?[a-zA-Zа-яА-ЯёЁ]?\s*$/, "");
    s = s.replace(/\s+\d+\s*$/, "");
  }

  // Strip remaining leading or trailing dashes / commas / separators (preserve abbreviation dot like Str.)
  s = s.replace(/^[\s\-–—,/#]+|[\s\-–—,/#]+$/g, "").trim();

  // If segment became solely a number or punctuation, clear it
  if (/^[\d\s,\-_./#]+$/.test(s)) {
    return "";
  }

  return s.trim();
}

/**
 * Deduplicate repeated tokens (e.g. "Berlin, Berlin" -> "Berlin", "Ankara, Ankara" -> "Ankara")
 * Case-insensitively, preserving order.
 */
function deduplicateSegments(segments: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const seg of segments) {
    const trimmed = seg.trim().replace(/^[\s\-–—,./#]+|[\s\-–—,./#]+$/g, "");
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }

  return result;
}

/**
 * Standardize and sanitize an address string for public display:
 * - Strips sensitive building numbers, apartment/unit/floor/room numbers, buzzer notes
 * - Removes attached postal codes
 * - Normalizes country and city tokens
 * - Deduplicates repeated tokens ("Berlin, Berlin")
 * - Cleans up punctuation and whitespace
 *
 * @param address - Raw or partially stripped address string
 * @param countryHint - Optional hint for country format
 * @returns Clean, privacy-safe, standardized address for display
 */
export function standardizeDisplayAddress(address: string | null | undefined, countryHint?: string): string {
  if (!address) return "";

  // Replace newlines with comma and space
  let clean = address.replace(/[\r\n]+/g, ", ");

  // Remove sensitive unit, apartment, floor, corpus, and buzzer notes
  for (const pattern of SENSITIVE_UNIT_PATTERNS) {
    clean = clean.replace(pattern, "");
  }

  // Remove postal / ZIP codes
  for (const pattern of POSTAL_CODE_PATTERNS) {
    clean = clean.replace(pattern, "");
  }

  // Split by comma or semicolon
  const rawSegments = clean.split(/[,;]+/);
  const processedSegments: string[] = [];

  for (const rawSeg of rawSegments) {
    let trimmed = rawSeg.trim();
    if (!trimmed) continue;

    // Check city abbreviation
    const lower = trimmed.toLowerCase();
    if (CITY_ABBREVIATIONS[lower]) {
      processedSegments.push(CITY_ABBREVIATIONS[lower]);
      continue;
    }

    // Check country standardization
    if (COUNTRY_MAP[lower]) {
      processedSegments.push(COUNTRY_MAP[lower]);
      continue;
    }

    // Check if segment contains "number - word" e.g. "3027 - Centro"
    const numberDashWord = trimmed.match(/^\s*\d+\s*[-–—]\s*(.+)$/);
    if (numberDashWord) {
      trimmed = numberDashWord[1].trim();
    }

    // Strip house/building number
    const sanitizedSeg = stripHouseNumber(trimmed);
    if (!sanitizedSeg) continue;

    let finalSeg = sanitizedSeg;
    // Capitalize words for Russian street abbreviations if missing:
    if (
      /^[а-яА-ЯёЁ\s]+$/.test(finalSeg) &&
      !/^(?:ул|пр|проспект|пер|бульвар|шоссе|наб|москва|санкт-петербург)/i.test(finalSeg)
    ) {
      finalSeg = finalSeg.charAt(0).toUpperCase() + finalSeg.slice(1);
    }

    // If segment is all lowercase, capitalize first letters for readability (e.g. "paderborn" -> "Paderborn")
    if (finalSeg === finalSeg.toLowerCase() && finalSeg.length > 2) {
      finalSeg = finalSeg
        .split(" ")
        .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
        .join(" ");
    }

    processedSegments.push(finalSeg);
  }

  // Deduplicate repeated tokens
  const deduped = deduplicateSegments(processedSegments);

  // If a country hint is provided and not already present, append it if appropriate
  if (countryHint) {
    const canonicalHint = COUNTRY_MAP[countryHint.toLowerCase()] ?? countryHint;
    const hasCountry = deduped.some(
      (s) => s.toLowerCase() === canonicalHint.toLowerCase() || s.toLowerCase() === countryHint.toLowerCase(),
    );
    if (!hasCountry && deduped.length > 0) {
      deduped.push(canonicalHint);
    }
  }

  // Join cleanly with comma and space
  let result = deduped.join(", ");

  // Final cleanup: remove double spaces, fix comma spacing, trim trailing commas
  result = result
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.\s-]+|[,.\s-]+$/g, "");

  return result;
}
