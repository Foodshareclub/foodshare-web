/**
 * Image API Types
 *
 * Client-side types mirroring the backend api-v1-images Edge Function.
 * Used by imageAPI.ts for type-safe uploads through the unified image pipeline.
 */

export interface ImageUploadOptions {
  /** Storage bucket (default: "food-images") */
  bucket?: string;
  /** Custom path within the bucket */
  path?: string;
  /** Generate a 300px thumbnail (default: true) */
  generateThumbnail?: boolean;
  /** Extract EXIF data - GPS, camera, timestamp (default: true) */
  extractEXIF?: boolean;
  /** Run AI food detection via HuggingFace (default: false) */
  enableAI?: boolean;
}

export interface ImageUploadResponseData {
  url: string;
  path: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
}

export interface ImageMetadata {
  originalSize: number;
  finalSize: number;
  savedBytes: number;
  savedPercent: number;
  format: string;
  dimensions?: {
    width: number;
    height: number;
  };
  exif?: {
    gps?: { latitude: number; longitude: number };
    timestamp?: string;
    camera?: { make?: string; model?: string };
    orientation?: number;
  };
  ai?: {
    tags: string[];
    confidence: number[];
    category?: string;
  };
  processingTime: number;
  compressionMethod?: string;
}

export interface ImageUploadResponse {
  success: boolean;
  data: ImageUploadResponseData;
  metadata: ImageMetadata;
}

export interface BatchUploadResponse {
  success: boolean;
  results: ImageUploadResponse[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    totalSavedBytes: number;
    processingTime: number;
  };
}

export type ImageAPIResult<T> = { data: T; error: null } | { data: null; error: Error };
