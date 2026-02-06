/**
 * Client-side image resizing for AI vision analysis.
 * Resizes images to 512px max dimension as JPEG base64 data URLs
 * to keep payloads small (~30-80KB each) for the Groq vision API.
 */

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.7;

/**
 * Resize a single image file to a base64 data URL suitable for AI vision.
 * Output: JPEG at 512px max dimension, ~0.7 quality.
 */
export async function resizeImageForAI(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate scaled dimensions maintaining aspect ratio
  let targetWidth = width;
  let targetHeight = height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      targetWidth = MAX_DIMENSION;
      targetHeight = Math.round((height / width) * MAX_DIMENSION);
    } else {
      targetHeight = MAX_DIMENSION;
      targetWidth = Math.round((width / height) * MAX_DIMENSION);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/**
 * Resize multiple image files in parallel.
 * Returns array of base64 data URLs in the same order as input.
 */
export async function resizeImagesForAI(files: File[]): Promise<string[]> {
  return Promise.all(files.map(resizeImageForAI));
}
