/**
 * Vercel Blob Storage Client
 * Used for file uploads (images, documents)
 */
import { put, del, list, head, copy } from '@vercel/blob';

export type BlobAccess = 'public';

export interface UploadOptions {
  access?: BlobAccess;
  contentType?: string;
  addRandomSuffix?: boolean;
  cacheControlMaxAge?: number;
}

export interface BlobUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  AVATAR: 2 * 1024 * 1024, // 2MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
} as const;

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/**
 * Validate file before upload
 */
export function validateFile(
  file: File | Blob,
  options: {
    maxSize?: number;
    allowedTypes?: readonly string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSize = MAX_FILE_SIZES.IMAGE, allowedTypes = ALLOWED_IMAGE_TYPES } = options;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed (${Math.round(maxSize / 1024 / 1024)}MB)`,
    };
  }

  if (file.type && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Upload a file to Vercel Blob storage
 */
export async function uploadBlob(
  pathname: string,
  file: File | Blob | ArrayBuffer | string,
  options: UploadOptions = {}
): Promise<BlobUploadResult> {
  const { access = 'public', contentType, addRandomSuffix = true, cacheControlMaxAge } = options;

  const blob = await put(pathname, file, {
    access,
    contentType,
    addRandomSuffix,
    cacheControlMaxAge,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
    size: blob.size,
  };
}

/**
 * Delete a blob by URL
 */
export async function deleteBlob(url: string): Promise<void> {
  await del(url);
}

/**
 * Delete multiple blobs by URLs
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  await del(urls);
}

/**
 * List blobs with optional prefix filter
 */
export async function listBlobs(options?: {
  prefix?: string;
  limit?: number;
  cursor?: string;
}): Promise<{
  blobs: Array<{
    url: string;
    pathname: string;
    size: number;
    uploadedAt: Date;
  }>;
  cursor?: string;
  hasMore: boolean;
}> {
  const result = await list(options);

  return {
    blobs: result.blobs.map((blob) => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    })),
    cursor: result.cursor,
    hasMore: result.hasMore,
  };
}

/**
 * Get blob metadata without downloading content
 */
export async function getBlobMetadata(url: string): Promise<{
  url: string;
  pathname: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
} | null> {
  try {
    const blob = await head(url);
    return {
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      contentType: blob.contentType,
      uploadedAt: blob.uploadedAt,
    };
  } catch {
    return null;
  }
}

// Blob path prefixes for organization
export const BLOB_PATHS = {
  PRODUCT_IMAGES: (productId: string) => `products/${productId}/`,
  USER_AVATARS: (userId: string) => `avatars/${userId}/`,
  CHAT_ATTACHMENTS: (roomId: string) => `chat/${roomId}/`,
  DOCUMENTS: 'documents/',
} as const;

/**
 * Copy a blob to a new location
 */
export async function copyBlob(
  sourceUrl: string,
  destinationPathname: string
): Promise<BlobUploadResult | null> {
  try {
    const blob = await copy(sourceUrl, destinationPathname, { access: 'public' });
    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: blob.size,
    };
  } catch (error) {
    console.error(`[Blob] Failed to copy blob:`, error);
    return null;
  }
}

/**
 * Upload product image with validation
 */
export async function uploadProductImage(
  productId: string,
  file: File | Blob,
  filename: string
): Promise<{ url: string } | { error: string }> {
  const validation = validateFile(file, {
    maxSize: MAX_FILE_SIZES.IMAGE,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });

  if (!validation.valid) {
    return { error: validation.error! };
  }

  try {
    const pathname = `${BLOB_PATHS.PRODUCT_IMAGES(productId)}${filename}`;
    const result = await uploadBlob(pathname, file, {
      access: 'public',
      contentType: file instanceof File ? file.type : 'image/jpeg',
      cacheControlMaxAge: 31536000, // 1 year
    });
    return { url: result.url };
  } catch (error) {
    console.error(`[Blob] Failed to upload product image:`, error);
    return { error: 'Failed to upload image' };
  }
}

/**
 * Upload user avatar with validation
 */
export async function uploadUserAvatar(
  userId: string,
  file: File | Blob
): Promise<{ url: string } | { error: string }> {
  const validation = validateFile(file, {
    maxSize: MAX_FILE_SIZES.AVATAR,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });

  if (!validation.valid) {
    return { error: validation.error! };
  }

  try {
    const pathname = `${BLOB_PATHS.USER_AVATARS(userId)}avatar`;
    const result = await uploadBlob(pathname, file, {
      access: 'public',
      contentType: file instanceof File ? file.type : 'image/jpeg',
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000, // 1 year
    });
    return { url: result.url };
  } catch (error) {
    console.error(`[Blob] Failed to upload avatar:`, error);
    return { error: 'Failed to upload avatar' };
  }
}

/**
 * Upload chat attachment
 */
export async function uploadChatAttachment(
  roomId: string,
  file: File | Blob,
  filename: string
): Promise<{ url: string } | { error: string }> {
  const validation = validateFile(file, {
    maxSize: MAX_FILE_SIZES.IMAGE,
    allowedTypes: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES],
  });

  if (!validation.valid) {
    return { error: validation.error! };
  }

  try {
    const pathname = `${BLOB_PATHS.CHAT_ATTACHMENTS(roomId)}${filename}`;
    const result = await uploadBlob(pathname, file, {
      access: 'public',
      contentType: file instanceof File ? file.type : undefined,
      addRandomSuffix: true,
    });
    return { url: result.url };
  } catch (error) {
    console.error(`[Blob] Failed to upload chat attachment:`, error);
    return { error: 'Failed to upload attachment' };
  }
}

/**
 * Delete all blobs for a product
 */
export async function deleteProductBlobs(productId: string): Promise<number> {
  try {
    const prefix = BLOB_PATHS.PRODUCT_IMAGES(productId);
    const { blobs } = await listBlobs({ prefix });
    if (blobs.length === 0) return 0;
    await deleteBlobs(blobs.map((b) => b.url));
    return blobs.length;
  } catch (error) {
    console.error(`[Blob] Failed to delete product blobs:`, error);
    return 0;
  }
}
