/**
 * Shape guard for the partner Airtable.
 *
 * A renamed column or a changed status vocabulary must never silently hide the
 * network. If the base no longer carries `Name` or `Status`, every row would be
 * skipped and every existing listing hidden; this refuses the run instead. A
 * single unknown status is a warning (it is treated as not Active); a
 * vocabulary where no value is known is refused.
 *
 * @module _shared/partner-sync/validate
 */

import type { AirtableRecord } from "./airtable.ts";

/** The status values the sync understands; anything else is reported. */
export const KNOWN_STATUSES = ["active", "inactive", "on hold", "setting up"];

export interface RecordShape {
  /** Missing fields that make the run unsafe; a non-empty list refuses it. */
  refused: string[];
  /** Conditions worth surfacing but not blocking. */
  warnings: string[];
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function inspectRecords(records: AirtableRecord[]): RecordShape {
  const refused: string[] = [];
  const warnings: string[] = [];

  const hasName = records.some((record) => text(record.fields.Name).length > 0);
  const hasStatusKey = records.some((record) => "Status" in record.fields);
  const hasAddress = records.some((record) => text(record.fields["Street address"]).length > 0);

  if (!hasName) refused.push("Name");
  if (!hasStatusKey) refused.push("Status");
  if (!hasAddress) warnings.push("Street address is empty on every record");

  const unknown = new Set<string>();
  let known = 0;
  for (const record of records) {
    const status = text(record.fields.Status).toLowerCase();
    if (!status) continue;
    if (KNOWN_STATUSES.includes(status)) known += 1;
    else unknown.add(status);
  }

  if (unknown.size > 0 && known === 0) refused.push("Status vocabulary changed");
  if (unknown.size > 0) {
    warnings.push(`Unknown status values: ${[...unknown].sort().join(", ")}`);
  }
  if (unknown.size === 0 && known === 0 && hasStatusKey) {
    warnings.push("Every record has a blank status");
  }

  return { refused, warnings };
}
