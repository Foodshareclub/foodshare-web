import { createClient } from "@supabase/supabase-js";
import { MDConnection } from "@motherduck/wasm-client";

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mdToken = Deno.env.get("MOTHERDUCK_TOKEN")!;

    if (!mdToken) throw new Error("Missing MOTHERDUCK_TOKEN");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Snapshot Data from Supabase
    // Fetch all users (profiles)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, created_at, role, full_name, email");

    if (profilesError) throw profilesError;

    // Fetch all listings (posts)
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, created_at, title, status, profile_id, type");

    if (postsError) throw postsError;

    console.log(`Fetched ${profiles.length} profiles and ${posts.length} posts.`);

    // 2. Connect to MotherDuck
    const conn = await MDConnection.create({
      mdToken,
    });

    // 3. Sync Users (Full Replenish / Snapshot)
    // We create a temp table or just truncate and insert.
    // For analytics snapshots, strict consistency isn't always required, but let's try to be clean.
    // We'll Create 'full_users' if not exists.

    await conn.evaluateQuery(`
      CREATE TABLE IF NOT EXISTS full_users (
        id VARCHAR,
        created_at TIMESTAMP,
        role VARCHAR,
        full_name VARCHAR,
        email VARCHAR,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Basic "Insert" strategy: clearing old snapshot might be better for "current state"
    // faster: DELETE FROM full_users; INSERT INTO ...
    await conn.evaluateQuery("DELETE FROM full_users");

    // Bulk insert users
    // Constructing large VALUES string is naive but effective for <10k rows on Edge.
    // For larger datasets, we'd stream CSV or use JSON.
    if (profiles.length > 0) {
      // Safe string escape function
      const esc = (s: unknown) =>
        s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`;

      const values = profiles
        .map(
          (p) =>
            `(${esc(p.id)}, ${esc(p.created_at)}, ${esc(p.role)}, ${esc(p.full_name)}, ${esc(p.email)}, CURRENT_TIMESTAMP)`
        )
        .join(",");

      await conn.evaluateQuery(`INSERT INTO full_users VALUES ${values}`);
    }

    // 4. Sync Listings
    await conn.evaluateQuery(`
      CREATE TABLE IF NOT EXISTS full_listings (
        id BIGINT,
        created_at TIMESTAMP,
        title VARCHAR,
        status VARCHAR,
        profile_id VARCHAR,
        type VARCHAR,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.evaluateQuery("DELETE FROM full_listings");

    if (posts.length > 0) {
      const esc = (s: unknown) =>
        s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`;

      const values = posts
        .map(
          (p) =>
            `(${p.id}, ${esc(p.created_at)}, ${esc(p.title)}, ${esc(p.status)}, ${esc(p.profile_id)}, ${esc(p.type)}, CURRENT_TIMESTAMP)`
        )
        .join(",");

      await conn.evaluateQuery(`INSERT INTO full_listings VALUES ${values}`);
    }

    // Cleanup
    // conn.close(); // ensure connection is closed? MDConnection logic.

    return new Response(
      JSON.stringify({
        success: true,
        synced: { users: profiles.length, listings: posts.length },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
