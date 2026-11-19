/**
 * Sync Metadata (MotherDuck `sync_metadata` table)
 *
 * Last-sync reads, writes, and status listing.
 * Extracted from `api-v1-analytics/index.ts` — no logic changes.
 */

import { executeMotherDuckQuery } from "./motherduck.ts";

export async function getLastSyncTime(
  mdToken: string,
  tableName: string,
): Promise<Date | null> {
  try {
    const result = (await executeMotherDuckQuery(
      mdToken,
      `SELECT last_sync_at FROM sync_metadata WHERE table_name = '${tableName}'`,
    )) as { data?: Array<{ last_sync_at: string }> };

    if (result.data && result.data.length > 0 && result.data[0].last_sync_at) {
      return new Date(result.data[0].last_sync_at);
    }
  } catch {
    // Table might not exist yet
  }
  return null;
}

export async function updateSyncMetadata(
  mdToken: string,
  tableName: string,
  recordsSynced: number,
  syncMode: string,
): Promise<void> {
  await executeMotherDuckQuery(
    mdToken,
    `INSERT OR REPLACE INTO sync_metadata (table_name, last_sync_at, records_synced, sync_mode)
     VALUES ('${tableName}', CURRENT_TIMESTAMP, ${recordsSynced}, '${syncMode}')`,
  );
}

export async function getSyncStatus(
  mdToken: string,
): Promise<Array<Record<string, unknown>>> {
  try {
    const result = (await executeMotherDuckQuery(
      mdToken,
      `SELECT table_name, last_sync_at, records_synced, sync_mode FROM sync_metadata ORDER BY table_name`,
    )) as { data?: Array<Record<string, unknown>> };
    return result.data || [];
  } catch {
    return [];
  }
}
