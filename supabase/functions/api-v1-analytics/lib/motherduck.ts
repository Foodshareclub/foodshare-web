/**
 * MotherDuck Client + Schema Setup
 *
 * Token retrieval, query execution, SQL escaping, warehouse DDL.
 * Extracted from `api-v1-analytics/index.ts` — no logic changes.
 */

import { ServerError } from "../../_shared/errors.ts";
import { getSupabaseClient } from "../../_shared/supabase.ts";

export async function getMotherDuckToken(): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc("get_vault_secret", {
    secret_name: "MOTHERDUCK_TOKEN",
  });

  if (error || !data) {
    throw new ServerError("Missing MOTHERDUCK_TOKEN in Vault");
  }

  return data;
}

export async function executeMotherDuckQuery(
  token: string,
  sql: string,
): Promise<unknown> {
  const response = await fetch("https://api.motherduck.com/v1/sql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ServerError(
      `MotherDuck API error: ${response.status} - ${errorText}`,
    );
  }

  return response.json();
}

export function escapeValue(s: unknown): string {
  if (s === null || s === undefined) return "NULL";
  if (typeof s === "boolean") return s ? "TRUE" : "FALSE";
  if (typeof s === "number") return String(s);
  return `'${String(s).replace(/'/g, "''")}'`;
}

export function getServiceRoleClient() {
  return getSupabaseClient();
}

export async function ensureSchema(mdToken: string): Promise<void> {
  await executeMotherDuckQuery(
    mdToken,
    `CREATE TABLE IF NOT EXISTS full_users (
      id VARCHAR PRIMARY KEY,
      created_at TIMESTAMP,
      updated_at TIMESTAMP,
      email VARCHAR,
      nickname VARCHAR,
      first_name VARCHAR,
      second_name VARCHAR,
      is_active BOOLEAN,
      is_verified BOOLEAN,
      last_seen_at TIMESTAMP,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await executeMotherDuckQuery(
    mdToken,
    `CREATE TABLE IF NOT EXISTS full_listings (
      id BIGINT PRIMARY KEY,
      created_at TIMESTAMP,
      updated_at TIMESTAMP,
      post_name VARCHAR,
      post_type VARCHAR,
      is_active BOOLEAN,
      is_arranged BOOLEAN,
      post_arranged_at TIMESTAMP,
      profile_id VARCHAR,
      post_views INTEGER,
      post_like_counter INTEGER,
      latitude DOUBLE,
      longitude DOUBLE,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await executeMotherDuckQuery(
    mdToken,
    `CREATE TABLE IF NOT EXISTS events (
      id VARCHAR PRIMARY KEY,
      event_name VARCHAR,
      user_id VARCHAR,
      properties VARCHAR,
      timestamp TIMESTAMP,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await executeMotherDuckQuery(
    mdToken,
    `CREATE TABLE IF NOT EXISTS sync_metadata (
      table_name VARCHAR PRIMARY KEY,
      last_sync_at TIMESTAMP,
      records_synced INTEGER,
      sync_mode VARCHAR
    )`,
  );
}
