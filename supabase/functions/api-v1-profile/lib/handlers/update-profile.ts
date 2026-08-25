import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { invalidateProfileCache } from "../../../_shared/cache.ts";
import { sanitizeHtml } from "../../../_shared/validation-rules.ts";
import { transformAddress } from "../../../_shared/transformers.ts";
import { transformProfile } from "../transformers.ts";
import type { QueryParams, UpdateAddressBody, UpdateProfileBody } from "../schemas.ts";

export async function updateProfile(ctx: HandlerContext<UpdateProfileBody>): Promise<Response> {
  const { supabase, userId, body } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) {
    const sanitizedName = sanitizeHtml(body.name.trim());
    const parts = sanitizedName.split(/\s+/);
    updates.first_name = parts[0] || "";
    updates.second_name = parts.slice(1).join(" ") || "";
    updates.display_name = sanitizedName;
  }
  if (body.bio !== undefined) updates.bio = sanitizeHtml(body.bio);
  if (body.phone !== undefined) updates.phone = sanitizeHtml(body.phone);
  if (body.location !== undefined) {
    updates.location = sanitizeHtml(body.location);
  }
  if (body.isVolunteer !== undefined) updates.is_volunteer = body.isVolunteer;
  if (body.profileVisibility !== undefined) {
    updates.profile_visibility = body.profileVisibility;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to update profile", new Error(error.message));
    throw error;
  }

  invalidateProfileCache(userId);
  logger.info("Profile updated", { userId });

  return ok(transformProfile(data), ctx);
}

export async function updateAddress(ctx: HandlerContext<UpdateAddressBody>): Promise<Response> {
  const { supabase, userId, body } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const addressParts = [
    body.addressLine1,
    body.addressLine2,
    body.addressLine3,
    body.city,
    body.stateProvince,
    body.postalCode,
    body.country,
  ].filter(Boolean);
  const generatedFullAddress = addressParts.join(", ");

  const { data: existing } = await supabase
    .from("address")
    .select("profile_id")
    .eq("profile_id", userId)
    .single();

  const addressData = {
    profile_id: userId,
    address_line_1: body.addressLine1,
    address_line_2: body.addressLine2 || "",
    address_line_3: body.addressLine3 || "",
    city: body.city,
    state_province: body.stateProvince || "",
    postal_code: body.postalCode || "",
    country: body.country,
    lat: body.lat ?? null,
    long: body.lng ?? null,
    generated_full_address: generatedFullAddress,
    radius_meters: body.radiusMeters ?? null,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from("address")
      .update(addressData)
      .eq("profile_id", userId)
      .select()
      .single();

    if (error) {
      logger.error("Failed to update address", new Error(error.message));
      throw error;
    }
    result = data;
  } else {
    const { data, error } = await supabase.from("address").insert(addressData).select().single();

    if (error) {
      logger.error("Failed to create address", new Error(error.message));
      throw error;
    }
    result = data;
  }

  logger.info("Address updated", { userId });

  return ok(transformAddress(result), ctx);
}

export function handlePut(
  ctx: HandlerContext<UpdateProfileBody | UpdateAddressBody, QueryParams>
): Promise<Response> {
  if (ctx.query.action === "address") {
    return updateAddress(ctx as HandlerContext<UpdateAddressBody, QueryParams>);
  }
  return updateProfile(ctx as HandlerContext<UpdateProfileBody, QueryParams>);
}
