/**
 * Image Optimization Pipeline
 *
 * Provides WebP conversion, responsive sizing, and blur placeholder generation
 * Uses Sharp for high-performance image processing on the server.
 */

import sharp from "sharp";

// ============================================================================
// Types
// ============================================================================

export interface ImageSize {
  name: string;
  width: number;
  height?: number;
  quality?: number;
}

export interface OptimizedImage {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  format: "webp" | "jpeg";
}

export interface ImageOptimizationResult {
  original: OptimizedImage;
  thumbnail?: OptimizedImage;
  medium?: OptimizedImage;
  large?: OptimizedImage;
  blurDataUrl?: string;
}

export interface OptimizationOptions {
  /** Generate thumbnail (64px) */
  thumbnail?: boolean;
  /** Generate medium size (480px) */
  medium?: boolean;
  /** Generate large size (1200px) */
  large?: boolean;
  /** Generate blur placeholder (20px base64) */
  blurPlaceholder?: boolean;
  /** Max width for original image (default: 1920) */
  maxWidth?: number;
  /** JPEG/WebP quality (default: 80) */
  quality?: number;
  /** Output format (default: webp) */
  format?: "webp" | "jpeg";
}

// ============================================================================
// Configuration
// ============================================================================

/** Standard image sizes for responsive loading */
export const IMAGE_SIZES: Record<string, ImageSize> = {
  thumbnail: { name: "thumbnail", width: 64, quality: 60 },
  medium: { name: "medium", width: 480, quality: 75 },
  large: { name: "large", width: 1200, quality: 80 },
  original: { name: "original", width: 1920, quality: 85 },
};

const DEFAULT_OPTIONS: Required<OptimizationOptions> = {
  thumbnail: true,
  medium: true,
  large: true,
  blurPlaceholder: true,
  maxWidth: 1920,
  quality: 80,
  format: "webp",
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Optimize an image with multiple sizes and optional blur placeholder
 */
export async function optimizeImage(
  input: Buffer | ArrayBuffer | Uint8Array,
  options: OptimizationOptions = {}
): Promise<ImageOptimizationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input as ArrayBuffer);

  // Get original image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 1920;
  const originalHeight = metadata.height || 1080;

  // Process original (constrained to maxWidth)
  const original = await resizeAndConvert(inputBuffer, {
    width: Math.min(originalWidth, opts.maxWidth),
    quality: opts.quality,
    format: opts.format,
  });

  const result: ImageOptimizationResult = { original };

  // Generate sizes in parallel for performance
  const tasks: Promise<void>[] = [];

  if (opts.thumbnail) {
    tasks.push(
      resizeAndConvert(inputBuffer, {
        width: IMAGE_SIZES.thumbnail.width,
        quality: IMAGE_SIZES.thumbnail.quality,
        format: opts.format,
      }).then((img) => {
        result.thumbnail = img;
      })
    );
  }

  if (opts.medium && originalWidth > IMAGE_SIZES.medium.width) {
    tasks.push(
      resizeAndConvert(inputBuffer, {
        width: IMAGE_SIZES.medium.width,
        quality: IMAGE_SIZES.medium.quality,
        format: opts.format,
      }).then((img) => {
        result.medium = img;
      })
    );
  }

  if (opts.large && originalWidth > IMAGE_SIZES.large.width) {
    tasks.push(
      resizeAndConvert(inputBuffer, {
        width: IMAGE_SIZES.large.width,
        quality: IMAGE_SIZES.large.quality,
        format: opts.format,
      }).then((img) => {
        result.large = img;
      })
    );
  }

  if (opts.blurPlaceholder) {
    tasks.push(
      generateBlurPlaceholder(inputBuffer).then((dataUrl) => {
        result.blurDataUrl = dataUrl;
      })
    );
  }

  await Promise.all(tasks);

  return result;
}

/**
 * Resize and convert image to WebP/JPEG
 */
async function resizeAndConvert(
  input: Buffer,
  options: {
    width: number;
    height?: number;
    quality?: number;
    format?: "webp" | "jpeg";
  }
): Promise<OptimizedImage> {
  const { width, height, quality = 80, format = "webp" } = options;

  let pipeline = sharp(input).resize(width, height, {
    fit: "inside",
    withoutEnlargement: true,
  });

  if (format === "webp") {
    pipeline = pipeline.webp({ quality, effort: 4 });
  } else {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    size: data.length,
    format,
  };
}

/**
 * Generate a tiny blur placeholder as base64 data URL
 */
export async function generateBlurPlaceholder(input: Buffer): Promise<string> {
  const blurBuffer = await sharp(input)
    .resize(20, 20, { fit: "inside" })
    .blur(2)
    .webp({ quality: 20 })
    .toBuffer();

  return `data:image/webp;base64,${blurBuffer.toString("base64")}`;
}

/**
 * Get image dimensions without full processing
 */
export async function getImageDimensions(
  input: Buffer | ArrayBuffer
): Promise<{ width: number; height: number }> {
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const metadata = await sharp(inputBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Validate image file before processing
 */
export function validateImageInput(
  input: Buffer | ArrayBuffer,
  maxSizeBytes: number = 10 * 1024 * 1024
): { valid: boolean; error?: string } {
  const size = input instanceof Buffer ? input.length : input.byteLength;

  if (size === 0) {
    return { valid: false, error: "Empty image data" };
  }

  if (size > maxSizeBytes) {
    return {
      valid: false,
      error: `Image too large (${Math.round(size / 1024 / 1024)}MB > ${Math.round(maxSizeBytes / 1024 / 1024)}MB)`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick optimize: Just convert to WebP with max dimensions
 */
export async function quickOptimize(
  input: Buffer | ArrayBuffer,
  maxWidth: number = 1920,
  quality: number = 80
): Promise<Buffer> {
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const result = await resizeAndConvert(inputBuffer, {
    width: maxWidth,
    quality,
    format: "webp",
  });
  return result.buffer;
}

/**
 * Create responsive image set for srcset
 */
export async function createResponsiveSet(input: Buffer | ArrayBuffer): Promise<{
  sizes: { width: number; buffer: Buffer }[];
  blurDataUrl: string;
}> {
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 1920;

  // Standard breakpoints
  const breakpoints = [320, 640, 768, 1024, 1280, 1536, 1920];
  const relevantBreakpoints = breakpoints.filter((bp) => bp <= originalWidth);

  const [sizes, blurDataUrl] = await Promise.all([
    Promise.all(
      relevantBreakpoints.map(async (width) => {
        const result = await resizeAndConvert(inputBuffer, { width, quality: 80 });
        return { width: result.width, buffer: result.buffer };
      })
    ),
    generateBlurPlaceholder(inputBuffer),
  ]);

  return { sizes, blurDataUrl };
}
