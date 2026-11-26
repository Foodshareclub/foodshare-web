import type { AirtableRecord } from "./airtable.ts";
import type { WeeklyHours } from "./hours.ts";

/**
 * One partner record, mapped onto a `posts` row.
 *
 * Their Airtable is the source of truth: every field here is written over our
 * row on each run, so a local edit does not survive. Only Active records are
 * listed; `partner_status` carries the partner's own value. `metadata.lacf`
 * holds the public details; the complete field mirror lives in
 * private.airtable_fridge_records. Contact fields are never projected here.
 */
export interface PartnerRow {
  fridge_id: string;
  post_name: string;
  post_address: string;
  latitude: number | null;
  longitude: number | null;
  available_hours: string;
  has_pantry: boolean;
  location_type: string;
  partner_status: string | null;
  /** Set by the sync: the record's photo, re-hosted (or empty). */
  images: string[];
  /** Set by the sync from the Hours text; null means unknown. */
  opening_hours: WeeklyHours | null;
  /** IANA zone the hours are evaluated in. */
  timezone: string;
  metadata: { lacf: Record<string, unknown> };
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";

const num = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(text(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];

/** The record's first photo attachment, fingerprinted for change detection. */
function photoSource(value: unknown): {
  attachment_id: string;
  filename: string;
  size: number | null;
  url: string;
} | null {
  if (!Array.isArray(value)) return null;
  const first = value.find((item) =>
    item && typeof item === "object" &&
    typeof (item as Record<string, unknown>).url === "string"
  );
  if (!first) return null;
  const item = first as Record<string, unknown>;
  return {
    attachment_id: text(item.id),
    filename: text(item.filename),
    size: num(item.size),
    url: text(item.url),
  };
}

/** Latitude and longitude, with the "lat, lng" field as a fallback. */
export function coordinates(fields: Record<string, unknown>): {
  latitude: number | null;
  longitude: number | null;
} {
  const direct = {
    latitude: num(fields.Latitude),
    longitude: num(fields.Longitude),
  };
  const valid = (lat: number | null, lng: number | null) =>
    lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  if (valid(direct.latitude, direct.longitude)) return direct;
  const match = text(fields["Full Latitude Longitude"]).match(
    /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
  );
  if (match) {
    const lat = Number.parseFloat(match[1]);
    const lng = Number.parseFloat(match[2]);
    if (valid(lat, lng)) return { latitude: lat, longitude: lng };
  }
  return { latitude: null, longitude: null };
}

export function mapRecord(record: AirtableRecord): PartnerRow | null {
  const fields = record.fields;
  const name = text(fields.Name);
  if (!name) return null;
  const street = text(fields["Street address"]);
  const city = text(fields.City);
  const photo = Array.isArray(fields.Photo) ? fields.Photo : [];
  const { latitude, longitude } = coordinates(fields);

  return {
    fridge_id: record.id,
    post_name: name,
    post_address: [street, city].filter(Boolean).join(", "),
    latitude,
    longitude,
    available_hours: text(fields.Hours),
    has_pantry: text(fields["Pantry?"]) === "Pantry available",
    location_type: text(fields["Location type"]),
    partner_status: text(fields.Status) || null,
    images: [],
    opening_hours: null,
    timezone: "",
    metadata: {
      lacf: {
        record_id: record.id,
        host_company: text(fields["Host Company"]),
        company_type: text(fields["Company type"]),
        languages: list(fields.Languages),
        reference_directions: text(fields["Reference directions"]),
        launch_date: text(fields["Launch date"]),
        region: text(fields.Region),
        region_manual: text(fields["Region (manual)"]),
        neighborhood: text(fields["Neighborhood lookup"]),
        map_link: text(fields["Map link"]),
        instagram_handle: text(fields["Instagram handle (no @)"]),
        latest_food_status: text(fields["Latest food status"]),
        latest_cleanliness_status: text(fields["Latest Cleanliness Status"]),
        total_check_ins: num(fields["Total check-ins"]),
        latest_log_date: text(fields["Latest log date"]),
        status_last_updated: text(fields["Status last updated"]),
        zip_code: text(fields["Zip code (for Glide)"]),
        has_photo: photo.length > 0,
        photo: photoSource(fields.Photo),
      },
    },
  };
}
