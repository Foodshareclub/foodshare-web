import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { NotFoundError, ValidationError } from "../../../_shared/errors.ts";
import { cache, CACHE_KEYS } from "../../../_shared/cache.ts";
import { createHealthHandler } from "../../../_shared/health-handler.ts";
import { aggregateCounts, aggregateImpact, aggregateStats } from "../../../_shared/aggregation.ts";
import { formatDisplayName, transformAddress } from "../../../_shared/transformers.ts";
import { transformProfile } from "../transformers.ts";
import type { QueryParams } from "../schemas.ts";

const VERSION = "1.0.0";
const healthCheck = createHealthHandler("api-v1-profile", VERSION);

export async function getProfile(
  ctx: HandlerContext<unknown, QueryParams>,
): Promise<Response> {
  const { supabase, userId } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const cacheKey = CACHE_KEYS.profile(userId);
  const cached = cache.get<Record<string, unknown>>(cacheKey);
  if (cached) {
    return ok(transformProfile(cached), ctx);
  }

  // Every column here has to exist: PostgREST rejects the whole statement if
  // one does not, and this handler turns any error into a 404 — so the five
  // columns that were listed but never defined (`display_name`,
  // `is_volunteer`, `rating_count`, `rating_average`, `created_at`) made
  // this endpoint return "not found" for every profile including the
  // caller's own.
  //
  // `created_time` is the column profiles actually has for creation time.
  // `display_name` is not a stored column — `formatDisplayName` derives it
  // from first/second name — and the volunteer and rating fields have no
  // source column at all, so the transformer emits them as null rather than
  // the query inventing a value.
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      second_name,
      nickname,
      bio,
      phone,
      location,
      avatar_url,
      created_time,
      updated_at,
      profile_visibility
    `)
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new NotFoundError("Profile", userId);
  }

  cache.set(cacheKey, data, 2 * 60 * 1000);
  return ok(transformProfile(data), ctx);
}

export async function getAddress(
  ctx: HandlerContext<unknown, QueryParams>,
): Promise<Response> {
  const { supabase, userId } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const { data, error } = await supabase
    .from("address")
    .select(`
      profile_id,
      address_line_1,
      address_line_2,
      address_line_3,
      city,
      state_province,
      postal_code,
      country,
      lat,
      long,
      generated_full_address,
      radius_meters
    `)
    .eq("profile_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return ok(null, ctx);
    }
    throw error;
  }

  return ok(transformAddress(data), ctx);
}

export async function getSession(
  ctx: HandlerContext<unknown, QueryParams>,
): Promise<Response> {
  const { supabase, userId } = ctx;

  if (!userId) {
    return ok({ userId: null, locale: "en", localeSource: "default" }, ctx);
  }

  // `display_name` is not a column on `profiles` — it is derived from
  // first/second name by `formatDisplayName`. Listing it made PostgREST
  // reject the statement, and the handler answered that rejection with a
  // default locale, so every session reported "en" from the fallback.
  const { data, error } = await supabase
    .from("profiles")
    .select("id,first_name,second_name,nickname,avatar_url,preferred_locale")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return ok({ userId, locale: "en", localeSource: "default" }, ctx);
  }

  return ok({
    userId: data.id,
    displayName: formatDisplayName(data),
    avatarUrl: data.avatar_url,
    locale: data.preferred_locale || "en",
    localeSource: data.preferred_locale ? "database" : "default",
  }, ctx);
}

export async function getDashboard(
  ctx: HandlerContext<unknown, QueryParams>,
): Promise<Response> {
  const { supabase, userId, query } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const [profile, stats, impact, counts] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    aggregateStats(supabase, userId),
    aggregateImpact(supabase, userId),
    aggregateCounts(supabase, userId),
  ]);

  let recentListings: any[] = [];
  if (query.includeListings) {
    // `post_name` not `title`; posts have no `status` column (liveness is
    // `is_active`); and the author column is `profile_id`, so filtering on
    // `user_id` matched nothing. Three wrong names in one statement, and the
    // error was discarded — `recentListings` was just always empty.
    const { data } = await supabase
      .from("posts")
      .select("id,post_name,images,is_active,created_at")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    recentListings = data || [];
  }

  return ok({
    user: profile.data,
    stats,
    impact,
    counts,
    recentListings,
  }, ctx);
}

export function handleGet(
  ctx: HandlerContext<unknown, QueryParams>,
): Promise<Response> {
  const url = new URL(ctx.request.url);
  if (url.pathname.endsWith("/health")) {
    return healthCheck(ctx);
  }

  if (ctx.query.action === "session") {
    return getSession(ctx);
  }
  if (ctx.query.action === "dashboard") {
    return getDashboard(ctx);
  }
  if (ctx.query.action === "address") {
    return getAddress(ctx);
  }
  return getProfile(ctx);
}
