import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.201.0/crypto/mod.ts";
import {
  ImageMagick,
  initialize,
  MagickFormat,
} from "https://deno.land/x/imagemagick_deno@0.0.25/mod.ts";
import { Tinify } from "https://deno.land/x/tinify@v1.0.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.2";
import response from "../_shared/response.ts";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { STORAGE_BUCKETS, validateFile } from "../_shared/storage-constants.ts";

const maxWidth = 1000;
const base64ToArrayBuffer = (base64) => {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  // Validate environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const tinifyApiKey = Deno.env.get("TINIFY_API_KEY");

  const missingVars = [];
  if (!supabaseUrl) missingVars.push("SUPABASE_URL");
  if (!supabaseAnonKey) missingVars.push("SUPABASE_ANON_KEY");
  if (!tinifyApiKey) missingVars.push("TINIFY_API_KEY");

  if (missingVars.length > 0) {
    console.error(`Missing environment variables: ${missingVars.join(", ")}`);
    return response(
      JSON.stringify({ error: `Server configuration error. Missing: ${missingVars.join(", ")}` }),
      500
    );
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const data = new Uint8Array(await req.arrayBuffer());
  const tinify = new Tinify({
    api_key: tinifyApiKey,
  });
  await initialize();
  return new Promise((resolve) => {
    ImageMagick.read(data, (img) => {
      // Resize image, maintaining aspect ratio
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      if (img.width > maxWidth || img.height > maxWidth) {
        if (img.width === img.height) {
          img.resize(maxWidth, maxWidth);
        } else if (img.width > img.height) {
          img.resize(maxWidth, maxWidth * ratio);
        } else {
          img.resize(maxWidth * ratio, maxWidth);
        }
      }
      img.write(MagickFormat.Png, async (data) => {
        // Tinify & convert response to buffer
        const tinyImage = await tinify.compress(data);
        const tinyImageBase64 = await tinyImage.toBase64();
        const tinyImageBuffer = base64ToArrayBuffer(tinyImageBase64.base64);

        // Validate file before upload
        const validation = validateFile("image/png", tinyImageBuffer.byteLength, "ASSETS");
        if (!validation.valid) {
          resolve(response(JSON.stringify({ error: validation.error }), 400));
          return;
        }

        // Upload buffer to store (using ASSETS bucket for processed images)
        const fileName = `${crypto.randomUUID()}-${new Date().getTime()}.png`;
        const res = await supabaseClient.storage
          .from(STORAGE_BUCKETS.ASSETS)
          .upload(fileName, tinyImageBuffer, {
            contentType: "image/png",
          });
        if (res.error) {
          resolve(response(res.error.message, 400));
        } else {
          resolve(response(JSON.stringify(res.data), 200));
        }
      });
    });
  });
});
