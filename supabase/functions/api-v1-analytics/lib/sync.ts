/**
 * Batch Sync Logic (users + listings)
 *
 * Full/incremental warehouse loads with batched INSERTs.
 * Extracted from `api-v1-analytics/index.ts` — no logic changes.
 */

import { ServerError } from "../../_shared/errors.ts";
import { CONFIG } from "./config.ts";
import { escapeValue, executeMotherDuckQuery, getServiceRoleClient } from "./motherduck.ts";
import { getLastSyncTime } from "./sync-metadata.ts";

export async function syncUsers(
  mdToken: string,
  mode: "full" | "incremental",
): Promise<number> {
  const supabase = getServiceRoleClient();

  if (mode === "full") {
    await executeMotherDuckQuery(mdToken, "DELETE FROM full_users");
  }

  let query = supabase
    .from("profiles")
    .select(
      "id, created_time, updated_at, email, nickname, first_name, second_name, is_active, is_verified, last_seen_at",
    );

  if (mode === "incremental") {
    const lastSync = await getLastSyncTime(mdToken, "full_users");
    const syncFrom = lastSync ||
      new Date(Date.now() - CONFIG.defaultIncrementalHours * 60 * 60 * 1000);
    query = query.gte("updated_at", syncFrom.toISOString());
  }

  const { data: profiles, error } = await query;
  if (error) {
    throw new ServerError(`Failed to fetch profiles: ${error.message}`);
  }
  if (!profiles || profiles.length === 0) return 0;

  // Incremental: delete existing records before re-inserting
  if (mode === "incremental") {
    const ids = profiles.map((p) => escapeValue(p.id)).join(",");
    await executeMotherDuckQuery(
      mdToken,
      `DELETE FROM full_users WHERE id IN (${ids})`,
    );
  }

  for (let i = 0; i < profiles.length; i += CONFIG.batchSize) {
    const batch = profiles.slice(i, i + CONFIG.batchSize);
    const values = batch
      .map(
        (p) =>
          `(${escapeValue(p.id)}, ${escapeValue(p.created_time)}, ${escapeValue(p.updated_at)}, ${
            escapeValue(p.email)
          }, ${escapeValue(p.nickname)}, ${escapeValue(p.first_name)}, ${
            escapeValue(p.second_name)
          }, ${escapeValue(p.is_active)}, ${escapeValue(p.is_verified)}, ${
            escapeValue(p.last_seen_at)
          }, CURRENT_TIMESTAMP)`,
      )
      .join(",");

    await executeMotherDuckQuery(
      mdToken,
      `INSERT INTO full_users (id, created_at, updated_at, email, nickname, first_name, second_name, is_active, is_verified, last_seen_at, synced_at) VALUES ${values}`,
    );
  }

  return profiles.length;
}

export async function syncListings(
  mdToken: string,
  mode: "full" | "incremental",
): Promise<number> {
  const supabase = getServiceRoleClient();

  if (mode === "full") {
    await executeMotherDuckQuery(mdToken, "DELETE FROM full_listings");
  }

  let query = supabase
    .from("posts_with_location")
    .select(
      "id, created_at, updated_at, post_name, post_type, is_active, is_arranged, post_arranged_at, profile_id, post_views, post_like_counter, latitude, longitude",
    );

  if (mode === "incremental") {
    const lastSync = await getLastSyncTime(mdToken, "full_listings");
    const syncFrom = lastSync ||
      new Date(Date.now() - CONFIG.defaultIncrementalHours * 60 * 60 * 1000);
    query = query.gte("updated_at", syncFrom.toISOString());
  }

  const { data: posts, error } = await query;
  if (error) {
    throw new ServerError(`Failed to fetch listings: ${error.message}`);
  }
  if (!posts || posts.length === 0) return 0;

  // Incremental: delete existing records before re-inserting
  if (mode === "incremental") {
    const ids = posts.map((p) => p.id).join(",");
    await executeMotherDuckQuery(
      mdToken,
      `DELETE FROM full_listings WHERE id IN (${ids})`,
    );
  }

  for (let i = 0; i < posts.length; i += CONFIG.batchSize) {
    const batch = posts.slice(i, i + CONFIG.batchSize);
    const values = batch
      .map(
        (p) =>
          `(${p.id}, ${escapeValue(p.created_at)}, ${escapeValue(p.updated_at)}, ${
            escapeValue(p.post_name)
          }, ${escapeValue(p.post_type)}, ${escapeValue(p.is_active)}, ${
            escapeValue(p.is_arranged)
          }, ${escapeValue(p.post_arranged_at)}, ${escapeValue(p.profile_id)}, ${
            p.post_views || 0
          }, ${p.post_like_counter || 0}, ${escapeValue(p.latitude)}, ${
            escapeValue(p.longitude)
          }, CURRENT_TIMESTAMP)`,
      )
      .join(",");

    await executeMotherDuckQuery(
      mdToken,
      `INSERT INTO full_listings (id, created_at, updated_at, post_name, post_type, is_active, is_arranged, post_arranged_at, profile_id, post_views, post_like_counter, latitude, longitude, synced_at) VALUES ${values}`,
    );
  }

  return posts.length;
}
