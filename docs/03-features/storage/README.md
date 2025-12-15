# Storage System Guide

## Overview

FoodShare uses Supabase Storage with a centralized, type-safe configuration system that includes automatic file validation. This guide covers everything you need to know about working with file uploads and storage.

> **Note:** The upload function uses direct `fetch` API calls instead of the Supabase client to avoid auth session hanging issues in production SSR environments. This provides more reliable uploads with a 30-second timeout.

---

## Quick Start

### Server Action Upload (Recommended)

For server-side uploads with R2/Supabase fallback:

```typescript
import { uploadToStorage, type UploadResult } from "@/app/actions/storage";
import { STORAGE_BUCKETS } from "@/constants/storage";

// Create FormData with file and metadata
const formData = new FormData();
formData.set("file", file);
formData.set("bucket", STORAGE_BUCKETS.POSTS);
formData.set("filePath", `posts/${userId}/${Date.now()}.jpg`);

// Upload via Server Action (handles R2 → Supabase fallback)
const result: UploadResult = await uploadToStorage(formData);

if (result.success) {
  console.log("Uploaded to:", result.storage); // 'r2' or 'supabase'
  console.log("Public URL:", result.publicUrl);
  console.log("Path:", result.path);
} else {
  console.error("Upload failed:", result.error);
}
```

### Client-Side Upload Example

```typescript
import { STORAGE_BUCKETS, validateFile } from "@/constants/storage";
import { storageAPI } from "@/api/storageAPI";

// 1. Validate file
const validation = validateFile(file, "POSTS");
if (!validation.valid) {
  alert(validation.error);
  return;
}

// 2. Upload with automatic validation
const { data, error } = await storageAPI.uploadImage({
  bucket: STORAGE_BUCKETS.POSTS,
  filePath: `posts/${userId}/${Date.now()}.jpg`,
  file: file,
});

// 3. Get public URL
if (data) {
  const url = storageAPI.getPublicUrl({
    bucket: STORAGE_BUCKETS.POSTS,
    path: data.path,
  });
  console.log("Uploaded:", url);
}
```

---

## Storage Buckets

### Available Buckets

| Bucket       | Purpose                | Max Size | Special Types    |
| ------------ | ---------------------- | -------- | ---------------- |
| `profiles`   | User avatars           | 5MB      | -                |
| `posts`      | Food listing images    | 10MB     | HEIC, HEIF       |
| `flags`      | Country/region flags   | 2MB      | SVG              |
| `forum`      | Discussion attachments | 10MB     | PDF, TXT         |
| `challenges` | Challenge images       | 5MB      | -                |
| `rooms`      | Chat images            | 5MB      | -                |
| `assets`     | General assets         | 50MB     | Video, PDF, JSON |

### Common Image Types (All Buckets)

- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)
- WebP (`.webp`)
- GIF (`.gif`)
- AVIF (`.avif`)

### Bucket-Specific Usage

```typescript
import { STORAGE_BUCKETS } from "@/constants/storage";

// User profile pictures
STORAGE_BUCKETS.PROFILES;

// Food listing photos
STORAGE_BUCKETS.POSTS;

// Country flags (supports SVG)
STORAGE_BUCKETS.FLAGS;

// Forum attachments (supports PDF)
STORAGE_BUCKETS.FORUM;

// Challenge images
STORAGE_BUCKETS.CHALLENGES;

// Chat images
STORAGE_BUCKETS.ROOMS;

// General assets (videos, docs, etc)
STORAGE_BUCKETS.ASSETS;
```

---

## File Validation

### Automatic Validation

The storage system automatically validates files before upload:

```typescript
const { data, error } = await storageAPI.uploadImage({
  bucket: STORAGE_BUCKETS.POSTS,
  filePath: "path/to/file.jpg",
  file: selectedFile,
  // validate: true (default)
});

// If validation fails, error will contain:
// "Invalid file type. Allowed types: PNG, JPEG, WEBP, GIF, AVIF, HEIC"
// or
// "File too large. Maximum size: 10MB"
```

### Manual Validation

Validate files before upload for better UX:

```typescript
import { validateFile, formatFileSize } from "@/constants/storage";

const handleFileSelect = (file: File) => {
  // Validate immediately
  const validation = validateFile(file, "POSTS");

  if (!validation.valid) {
    // Show error to user
    setError(validation.error);
    return;
  }

  // File is valid, proceed
  setSelectedFile(file);
};
```

### Validation Helpers

```typescript
import {
  isValidFileType,
  isValidFileSize,
  validateFile,
  formatFileSize,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
} from "@/constants/storage";

// Check file type only
if (!isValidFileType(file, "POSTS")) {
  console.error("Invalid file type");
}

// Check file size only
if (!isValidFileSize(file, "POSTS")) {
  console.error("File too large");
}

// Full validation with error message
const result = validateFile(file, "POSTS");
if (!result.valid) {
  console.error(result.error);
}

// Format file size for display
const sizeText = formatFileSize(file.size); // "2.5 MB"

// Get allowed types for a bucket
const allowedTypes = ALLOWED_MIME_TYPES.POSTS;
// ["image/png", "image/jpeg", "image/webp", ...]

// Get max size for a bucket
const maxSize = MAX_FILE_SIZES.POSTS; // 10485760 (10MB in bytes)
```

---

## Storage API Methods

### Upload Image

Uses direct `fetch` API with 30-second timeout for reliable uploads:

```typescript
const { data, error } = await storageAPI.uploadImage({
  bucket: STORAGE_BUCKETS.POSTS,
  filePath: "path/to/file.jpg",
  file: fileObject,
  validate: true, // Optional, default: true
});

if (error) {
  console.error("Upload failed:", error.message);
  // Possible errors:
  // - "Upload timed out after 30 seconds..."
  // - "Upload failed: 401 Unauthorized"
  // - "Supabase configuration missing"
  return;
}

console.log("Uploaded to:", data.path);
```

**Implementation details:**

- Uses direct REST API calls to `{SUPABASE_URL}/storage/v1/object/{bucket}/{path}`
- Bypasses Supabase client auth to avoid SSR session hanging issues
- 30-second timeout with `AbortController`
- Supports upsert (overwrites existing files)

### Get Public URL

```typescript
const url = storageAPI.getPublicUrl({
  bucket: STORAGE_BUCKETS.POSTS,
  path: "path/to/file.jpg",
});

// Returns: https://your-project.supabase.co/storage/v1/object/public/posts/path/to/file.jpg
```

### Download Image

```typescript
const { data, error } = await storageAPI.downloadImage({
  bucket: STORAGE_BUCKETS.POSTS,
  path: "path/to/file.jpg",
});

if (data) {
  // data is a Blob
  const url = URL.createObjectURL(data);
  // Use url for display
}
```

### Delete Image

```typescript
const { error } = await storageAPI.deleteImage({
  bucket: STORAGE_BUCKETS.POSTS,
  path: "path/to/file.jpg",
});

if (error) {
  console.error("Delete failed:", error.message);
}
```

### Create Signed URL (Private Files)

```typescript
const { data, error } = await storageAPI.createSignedUrl(
  {
    bucket: STORAGE_BUCKETS.PROFILES,
    path: "private/file.jpg",
  },
  3600
); // Expires in 1 hour

if (data) {
  console.log("Signed URL:", data.signedUrl);
}
```

---

## React Component Patterns

### Basic Upload Component

```typescript
import React, { useState } from 'react';
import { Trans } from '@lingui/macro';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STORAGE_BUCKETS, validateFile, formatFileSize } from '@/constants/storage';
import { storageAPI } from '@/api/storageAPI';

export const ImageUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate immediately
    const validation = validateFile(selectedFile, 'POSTS');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filePath = `uploads/${timestamp}.${ext}`;

      const { data, error: uploadError } = await storageAPI.uploadImage({
        bucket: STORAGE_BUCKETS.POSTS,
        filePath,
        file,
      });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const url = storageAPI.getPublicUrl({
        bucket: STORAGE_BUCKETS.POSTS,
        path: filePath,
      });

      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Input type="file" onChange={handleFileChange} accept="image/*" />

      {file && (
        <p>
          <Trans>Selected:</Trans> {file.name} ({formatFileSize(file.size)})
        </p>
      )}

      {error && <p className="text-red-600">{error}</p>}

      <Button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? <Trans>Uploading...</Trans> : <Trans>Upload</Trans>}
      </Button>

      {imageUrl && <img src={imageUrl} alt="Uploaded" />}
    </div>
  );
};
```

### Advanced Upload with Preview

```typescript
import React, { useState, useCallback } from 'react';
import { Trans } from '@lingui/macro';
import { STORAGE_BUCKETS, validateFile, ALLOWED_MIME_TYPES } from '@/constants/storage';
import { storageAPI } from '@/api/storageAPI';

export const AdvancedImageUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate
    const validation = validateFile(selectedFile, 'POSTS');
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);

    setFile(selectedFile);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setUploading(true);

    try {
      const { data, error } = await storageAPI.uploadImage({
        bucket: STORAGE_BUCKETS.POSTS,
        filePath: `posts/${Date.now()}.${file.name.split('.').pop()}`,
        file,
      });

      if (error) throw error;

      // Success - do something with the URL
      const url = storageAPI.getPublicUrl({
        bucket: STORAGE_BUCKETS.POSTS,
        path: data.path,
      });

      console.log('Uploaded:', url);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [file]);

  return (
    <div>
      <input
        type="file"
        accept={ALLOWED_MIME_TYPES.POSTS.join(',')}
        onChange={handleFileChange}
      />

      {preview && (
        <div>
          <img src={preview} alt="Preview" style={{ maxWidth: '300px' }} />
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? <Trans>Uploading...</Trans> : <Trans>Upload</Trans>}
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## File Naming Best Practices

### Recommended Patterns

```typescript
// User-specific files
const filePath = `${userId}/${timestamp}.${ext}`;
// Example: "a1b2c3d4/1234567890.jpg"

// Post/listing images
const filePath = `posts/${postId}/${timestamp}.${ext}`;
// Example: "posts/123/1234567890.jpg"

// Dated organization
const date = new Date().toISOString().split("T")[0];
const filePath = `${date}/${userId}/${timestamp}.${ext}`;
// Example: "2024-01-29/a1b2c3d4/1234567890.jpg"

// With original filename (sanitized)
const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
const filePath = `${userId}/${timestamp}_${sanitized}`;
// Example: "a1b2c3d4/1234567890_my_photo.jpg"
```

### File Extension Handling

```typescript
// Get extension from filename
const ext = file.name.split(".").pop()?.toLowerCase();

// Get extension from MIME type
const mimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
};
const ext = mimeToExt[file.type] || "jpg";
```

---

## Migration from Old System

### Before (Old System)

```typescript
// ❌ Hardcoded bucket names
await supabase.storage.from("avatars-posts").upload(path, file);
await supabase.storage.from("users").upload(path, file);

// ❌ No validation
// Files could be any size or type

// ❌ Manual URL construction
const url = `${supabaseUrl}/storage/v1/object/public/avatars-posts/${path}`;
```

### After (New System)

```typescript
// ✅ Type-safe constants
import { STORAGE_BUCKETS } from "@/constants/storage";
import { storageAPI } from "@/api/storageAPI";

// ✅ Automatic validation
const { data, error } = await storageAPI.uploadImage({
  bucket: STORAGE_BUCKETS.POSTS,
  filePath: path,
  file: file,
});

// ✅ Helper method for URLs
const url = storageAPI.getPublicUrl({
  bucket: STORAGE_BUCKETS.POSTS,
  path: data.path,
});
```

### Bucket Name Changes

| Old Bucket      | New Bucket | Purpose               |
| --------------- | ---------- | --------------------- |
| `avatars`       | `profiles` | User avatars          |
| `avatars-posts` | `posts`    | Food listing images   |
| `users`         | `profiles` | User profile pictures |

---

## Error Handling

### Common Errors

```typescript
try {
  const { data, error } = await storageAPI.uploadImage({
    bucket: STORAGE_BUCKETS.POSTS,
    filePath: path,
    file: file,
  });

  if (error) {
    // Handle specific errors
    if (error.message.includes("Invalid file type")) {
      alert("Please select a valid image file");
    } else if (error.message.includes("File too large")) {
      alert("File is too large. Maximum size is 10MB");
    } else if (error.message.includes("timed out")) {
      alert("Upload timed out. Please check your connection and try again.");
    } else if (error.message.includes("401") || error.message.includes("403")) {
      alert("Upload not authorized. Please sign in again.");
    } else if (error.message.includes("configuration missing")) {
      console.error("Supabase environment variables not configured");
      alert("Server configuration error. Please contact support.");
    } else {
      alert("Upload failed. Please try again.");
    }
    return;
  }

  // Success
  console.log("Uploaded:", data.path);
} catch (err) {
  console.error("Unexpected error:", err);
  alert("An unexpected error occurred");
}
```

### Validation Errors

```typescript
const validation = validateFile(file, "POSTS");

if (!validation.valid) {
  // validation.error contains user-friendly message:
  // "Invalid file type. Allowed types: PNG, JPEG, WEBP, GIF, AVIF, HEIC"
  // "File too large. Maximum size: 10MB"

  showErrorToUser(validation.error);
  return;
}
```

---

## Testing

### Automated Test Suite

Run the comprehensive storage validation test suite:

```bash
npm run test:storage
```

This runs `scripts/test-storage-validation.ts` which tests:

- ✅ Bucket constant definitions
- ✅ MIME type validation for all buckets
- ✅ File size validation with various sizes
- ✅ Full validation function
- ✅ Helper functions (getMaxFileSize, getAllowedMimeTypes)
- ✅ Edge cases (empty MIME, zero size, uppercase MIME)

The test suite provides detailed output showing which tests passed/failed and exits with an error code if any tests fail, making it suitable for CI/CD pipelines.

### Unit Tests

```typescript
import { describe, it, expect } from "vitest";
import { validateFile, formatFileSize, isValidFileType } from "@/constants/storage";

describe("Storage Validation", () => {
  it("should validate file type", () => {
    const file = new File([""], "test.jpg", { type: "image/jpeg" });
    expect(isValidFileType(file, "POSTS")).toBe(true);
  });

  it("should reject invalid file type", () => {
    const file = new File([""], "test.exe", { type: "application/exe" });
    expect(isValidFileType(file, "POSTS")).toBe(false);
  });

  it("should format file size correctly", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1048576)).toBe("1 MB");
    expect(formatFileSize(2621440)).toBe("2.5 MB");
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from "vitest";
import { storageAPI } from "@/api/storageAPI";
import { STORAGE_BUCKETS } from "@/constants/storage";

describe("Storage API", () => {
  it("should upload and retrieve image", async () => {
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    const { data, error } = await storageAPI.uploadImage({
      bucket: STORAGE_BUCKETS.POSTS,
      filePath: `test/${Date.now()}.jpg`,
      file,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.path).toBeTruthy();

    // Cleanup
    await storageAPI.deleteImage({
      bucket: STORAGE_BUCKETS.POSTS,
      path: data!.path,
    });
  });
});
```

---

## Performance Tips

### Image Optimization

```typescript
// Compress images before upload
import imageCompression from "browser-image-compression";

const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  return await imageCompression(file, options);
};

// Use in upload
const handleUpload = async (file: File) => {
  const compressed = await compressImage(file);

  await storageAPI.uploadImage({
    bucket: STORAGE_BUCKETS.POSTS,
    filePath: path,
    file: compressed,
  });
};
```

### Lazy Loading Images

```typescript
<img
  src={imageUrl}
  alt="Description"
  loading="lazy"
  decoding="async"
/>
```

### Progressive Image Loading

```typescript
import { useState } from 'react';

const ProgressiveImage: React.FC<{ src: string }> = ({ src }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative">
      {!loaded && <div className="skeleton-loader" />}
      <img
        src={src}
        onLoad={() => setLoaded(true)}
        className={loaded ? 'opacity-100' : 'opacity-0'}
        style={{ transition: 'opacity 0.3s' }}
      />
    </div>
  );
};
```

---

## Security Considerations

### Public vs Private Buckets

All current buckets are **public** - anyone with the URL can access files.

For private files:

1. Use RLS policies on Supabase
2. Generate signed URLs with expiration
3. Validate user permissions before generating URLs

### File Upload Security

```typescript
// ✅ Always validate on client
const validation = validateFile(file, "POSTS");
if (!validation.valid) return;

// ✅ Validate on server (Supabase Storage policies)
// Set up bucket policies in Supabase dashboard

// ✅ Sanitize filenames
const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

// ✅ Use user-specific paths
const path = `${userId}/${sanitized}`;
```

---

## Troubleshooting

### Upload Fails Silently

```typescript
// Check for validation errors
const validation = validateFile(file, "POSTS");
console.log("Validation:", validation);

// Check file properties
console.log("File type:", file.type);
console.log("File size:", file.size);
console.log("File name:", file.name);
```

### CORS Errors

Ensure Supabase Storage CORS is configured:

1. Go to Supabase Dashboard → Storage → Settings
2. Add your domain to allowed origins
3. Include `http://localhost:3000` for development

### File Not Found

```typescript
// Verify bucket name
console.log("Bucket:", STORAGE_BUCKETS.POSTS);

// Verify path
console.log("Path:", filePath);

// Check if file exists
const { data } = await supabase.storage.from(STORAGE_BUCKETS.POSTS).list(directory);
console.log("Files:", data);
```

---

## Reference

### Complete Example Component

See `src/components/examples/StorageUploadExample.tsx` for a complete, production-ready example with:

- File validation
- Upload progress
- Error handling
- Success feedback
- Image preview
- Internationalization

### Related Documentation

- [Storage Migration Guide](./storage-migration-complete.md)
- [Examples](./EXAMPLES.md#example-7-storage-upload-with-validation)
- [API Reference](../src/api/storageAPI.ts)
- [Storage Constants](../src/constants/storage.ts)

---

## Architecture Notes

### Upload Implementation

There are two upload approaches available:

#### 1. Server Action (Recommended for R2)

The `uploadToStorage` Server Action (`src/app/actions/storage.ts`) handles uploads server-side where Vault credentials are accessible:

**Key characteristics:**

- Runs on the server where R2 Vault secrets are accessible
- Automatic fallback: R2 → Supabase Storage
- Built-in file validation (can be skipped via `skipValidation`)
- Returns storage type used (`'r2'` or `'supabase'`)

```typescript
import { uploadToStorage } from "@/app/actions/storage";

const formData = new FormData();
formData.set("file", file);
formData.set("bucket", "posts");
formData.set("filePath", "posts/123/image.jpg");
// formData.set('skipValidation', 'true'); // Optional

const result = await uploadToStorage(formData);
// { success: true, path: '...', publicUrl: '...', storage: 'r2' }
```

#### 2. Client-Side API (Supabase Only)

The `storageAPI.uploadImage()` function uses **direct fetch API** instead of the Supabase JavaScript client for uploads. This design decision was made to avoid auth session hanging issues that can occur in production SSR environments when the Supabase client's internal `getSession()` call blocks.

**Key characteristics:**

- Direct REST API calls to Supabase Storage endpoints
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables
- 30-second timeout via `AbortController`
- Upsert enabled by default (`x-upsert: true` header)

**Other methods** (`downloadImage`, `deleteImage`, `getPublicUrl`, `createSignedUrl`) still use the Supabase client as they don't exhibit the same hanging behavior.

### When to Use Which

| Scenario                   | Recommended Approach              |
| -------------------------- | --------------------------------- |
| R2 storage needed          | Server Action (`uploadToStorage`) |
| Vault credentials required | Server Action (`uploadToStorage`) |
| Client-only upload         | `storageAPI.uploadImage()`        |
| Simple Supabase upload     | `storageAPI.uploadImage()`        |

---

**Last Updated:** 2024-12-14
