import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { geocodeAddress, type Coordinates } from "../_shared/geocoding.ts";

const API_DELAY = 1000; // 1 second delay between batch operations

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function updatePostCoordinates(
  supabase: any,
  post: { id: number; post_address?: string; location?: string }
): Promise<{
  id: number;
  success: boolean;
  reason?: string;
  address?: string;
  coordinates?: Coordinates;
}> {
  console.log(`Processing coordinates for post_id: ${post.id}`);

  if (!post.post_address) {
    console.log(`No post_address for post_id: ${post.id}`);
    return {
      id: post.id,
      success: false,
      reason: "No post_address available",
    };
  }

  // Skip if location already exists
  if (post.location) {
    console.log(`Location already exists for post_id: ${post.id}`);
    return {
      id: post.id,
      success: true,
      reason: "Existing location is valid",
    };
  }

  console.log(`Geocoding required for post_id: ${post.id}`);

  // Use shared geocoding service
  const coordinates = await geocodeAddress(post.post_address);

  if (!coordinates) {
    console.log(`No coordinates found for address: ${post.post_address}`);
    return {
      id: post.id,
      success: false,
      reason: "No coordinates found",
      address: post.post_address,
    };
  }

  try {
    const { error: updateError } = await supabase
      .from("posts")
      .update({
        location: `SRID=4326;POINT(${coordinates.longitude} ${coordinates.latitude})`,
      })
      .eq("id", post.id);

    if (updateError) throw updateError;

    console.log(`Coordinates updated successfully for post_id: ${post.id}`);
    return {
      id: post.id,
      success: true,
      address: post.post_address,
      coordinates,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error updating coordinates for post_id ${post.id}:`, errorMessage);
    return {
      id: post.id,
      success: false,
      reason: errorMessage,
    };
  }
}
async function batchUpdateCoordinates(supabase: any): Promise<{
  message: string;
  updates: any[];
  error?: any;
}> {
  console.log("Starting batch update process");

  const { data: posts, error: fetchError } = await supabase
    .from("posts")
    .select("id, post_address, location")
    .is("location", null)
    .order("created_at")
    .limit(10);

  if (fetchError) {
    console.error("Error fetching posts:", fetchError);
    return {
      message: "Error fetching posts",
      error: fetchError,
      updates: [],
    };
  }

  console.log(`Found ${posts?.length || 0} posts to update`);

  if (!posts || posts.length === 0) {
    return {
      message: "No posts found for update",
      updates: [],
    };
  }

  const updates = [];

  for (const post of posts) {
    console.log(`Processing post ${post.id}`);
    try {
      const result = await updatePostCoordinates(supabase, post);
      updates.push(result);
      console.log(`Updated post ${post.id}:`, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error updating post ${post.id}:`, errorMessage);
      updates.push({
        id: post.id,
        success: false,
        reason: errorMessage,
      });
    }

    // Rate limiting between batch operations
    await delay(API_DELAY);
  }

  const successCount = updates.filter((u) => u.success).length;
  console.log(`Batch update completed. ${successCount}/${updates.length} successful`);

  return {
    message: "Batch update completed",
    updates,
  };
}
async function checkOtherPosts(supabase: any): Promise<{
  message: string;
  checks: any[];
  error?: string;
  details?: any;
}> {
  console.log("Starting check other posts process");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: posts, error: fetchError } = await supabase
    .from("posts")
    .select("id, title, created_at, last_activity_at")
    .lt("created_at", sevenDaysAgo.toISOString())
    .is("last_activity_at", null)
    .order("created_at")
    .limit(10);

  if (fetchError) {
    console.error("Error fetching other posts:", fetchError);
    return {
      message: "Error fetching other posts",
      error: "Error fetching other posts",
      details: fetchError,
      checks: [],
    };
  }

  console.log(`Found ${posts?.length || 0} other posts to check`);

  if (!posts || posts.length === 0) {
    return {
      message: "No other posts found to check",
      checks: [],
    };
  }

  const checks = [];

  for (const post of posts) {
    console.log(`Checking post ${post.id}`);

    const checkResult: any = {
      id: post.id,
      title: post.title,
      created_at: post.created_at,
      status: "checked",
    };

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (updateError) {
      console.error(`Error updating last_activity_at for post ${post.id}:`, updateError);
      checkResult.status = "error";
      checkResult.error = updateError.message;
    }

    checks.push(checkResult);
    await delay(API_DELAY);
  }

  console.log(`Other posts check completed. Checked ${checks.length} posts.`);

  return {
    message: "Other posts check completed",
    checks,
  };
}
serve(async (req) => {
  console.log("Function started - Updating post coordinates and checking other posts");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
    return new Response(
      JSON.stringify({
        error: "Server configuration error",
      }),
      {
        status: 500,
      }
    );
  }
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  try {
    const { id, post_address, operation } = await req.json();
    if (operation === "BATCH_UPDATE") {
      const result = await batchUpdateCoordinates(supabase);
      return new Response(JSON.stringify(result), {
        status: 200,
      });
    } else if (operation === "DELETE") {
      console.log(`Post with id ${id} has been deleted`);
      return new Response(
        JSON.stringify({
          message: "Delete operation acknowledged",
          id: id,
        }),
        {
          status: 200,
        }
      );
    } else if (operation === "CHECK_OTHER_POSTS") {
      const result = await checkOtherPosts(supabase);
      return new Response(JSON.stringify(result), {
        status: 200,
      });
    } else {
      if (!id || !post_address) {
        return new Response(
          JSON.stringify({
            error: "Missing id or post_address in request body",
          }),
          {
            status: 400,
          }
        );
      }
      console.log(`Processing single post update for post_id: ${id}`);
      const result = await updatePostCoordinates(supabase, {
        id,
        post_address,
      });
      console.log(`Single post update result: ${JSON.stringify(result)}`);
      return new Response(JSON.stringify(result), {
        status: 200,
      });
    }
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
      }
    );
  }
});
