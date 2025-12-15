# Storage System Quick Reference

## Import What You Need

```typescript
// Constants
import {
  STORAGE_BUCKETS, // Bucket names
  ALLOWED_MIME_TYPES, // Allowed file types per bucket
  MAX_FILE_SIZES, // Size limits per bucket
  validateFile, // Validate file before upload
  isValidFileType, // Check MIME type
  isValidFileSize, // Check file size
  formatFileSize, // Format bytes to human-readable
  getStorageUrl, // Generate public URL
} from "@/constants/storage";

// Server Action (R2 + Supabase fallback)
import { uploadToStorage, type UploadResult } from "@/app/actions/storage";

// Client API (Supabase only)
import { storageAPI } from "@/api/storageAPI";
```

## Bucket Names

```typescript
STORAGE_BUCKETS.PROFILES; // "profiles" - User avatars
STORAGE_BUCKETS.POSTS; // "posts" - Food listing images
STORAGE_BUCKETS.FLAGS; // "flags" - Country flags
STORAGE_BUCKETS.FORUM; // "forum" - Discussion attachments
STORAGE_BUCKETS.CHALLENGES; // "challenges" - Challenge images
STORAGE_BUCKETS.ROOMS; // "rooms" - Chat images
STORAGE_BUCKETS.ASSETS; // "assets" - General assets
```

## Common Operations

### Upload File (Server Action - Recommended)

```typescript
// Server Action with R2 → Supabase fallback
const formData = new FormData();
formData.set("file", file);
formData.set("bucket", STORAGE_BUCKETS.POSTS);
formData.set("filePath", "123/image.jpg");

const result = await uploadToStorage(formData);
if (result.success) {
  console.log(result.publicUrl, result.storage); // 'r2' or 'supabase'
}
```

### Upload File (Client API)

```typescript
const { data, error } = await storageAPI.uploadImage({
  bucket: STORAGE_BUCKETS.POSTS,
  filePath: "123/image.jpg",
  file: file,
  validate: true, // optional, default: true
});
```

### Get Public URL

```typescript
const url = storageAPI.getPublicUrl({
  bucket: STORAGE_BUCKETS.POSTS,
  path: "123/image.jpg",
});
```

### Delete File

```typescript
const { error } = await storageAPI.deleteImage({
  bucket: STORAGE_BUCKETS.POSTS,
  path: "123/image.jpg",
});
```

### Download File

```typescript
const { data, error } = await storageAPI.downloadImage({
  bucket: STORAGE_BUCKETS.POSTS,
  path: "123/image.jpg",
});
```

## Validation

### Validate Before Upload

```typescript
const validation = validateFile(file, "POSTS");
if (!validation.valid) {
  console.error(validation.error);
  return;
}
```

### Check File Type

```typescript
if (!isValidFileType(file, "PROFILES")) {
  console.error("Invalid file type");
}
```

### Check File Size

```typescript
if (!isValidFileSize(file, "POSTS")) {
  console.error("File too large");
}
```

## File Input

```tsx
<input
  type="file"
  accept={ALLOWED_MIME_TYPES.POSTS.join(",")}
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, "POSTS");
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    handleUpload(file);
  }}
/>
```

## Allowed File Types

### Images (All Buckets)

- PNG, JPEG, WebP, GIF, AVIF

### Posts Only

- HEIC, HEIF (iPhone photos)

### Flags & Assets

- SVG (vector graphics)

### Forum & Assets

- PDF (documents)
- TXT (text files)

### Assets Only

- MP4, WebM (videos)
- CSS, JSON (code files)

## File Size Limits

| Bucket     | Max Size |
| ---------- | -------- |
| profiles   | 5 MB     |
| posts      | 10 MB    |
| flags      | 2 MB     |
| forum      | 10 MB    |
| challenges | 5 MB     |
| rooms      | 5 MB     |
| assets     | 50 MB    |

## Utilities

### Format File Size

```typescript
formatFileSize(5242880); // "5 MB"
formatFileSize(1024); // "1 KB"
```

### Generate URL

```typescript
const url = getStorageUrl(STORAGE_BUCKETS.POSTS, "123/image.jpg");
// https://[project].supabase.co/storage/v1/object/public/posts/123/image.jpg
```

## Error Handling

```typescript
try {
  const { data, error } = await storageAPI.uploadImage({
    bucket: STORAGE_BUCKETS.POSTS,
    filePath: "123/image.jpg",
    file: file,
  });

  if (error) {
    if (error.message.includes("mime type")) {
      toast.error("Invalid file type");
    } else if (error.message.includes("size")) {
      toast.error("File too large");
    } else {
      toast.error("Upload failed");
    }
    return;
  }

  toast.success("Upload successful!");
} catch (error) {
  console.error("Upload error:", error);
  toast.error("Unexpected error");
}
```

## Redux Integration

```typescript
import { uploadPostImgToDBTC } from "@/store";
import { STORAGE_BUCKETS } from "@/constants/storage";

// Dispatch upload action
dispatch(
  uploadPostImgToDBTC({
    bucket: STORAGE_BUCKETS.POSTS,
    filePath: `${postId}/image.jpg`,
    file: file,
  })
);
```

## Testing & Verification

### Test Storage Validation

Run the comprehensive test suite to verify validation logic:

```bash
npm run test:storage
```

This tests:

- ✅ Bucket constants
- ✅ MIME type validation (8 test cases)
- ✅ File size validation (7 test cases)
- ✅ Full validation function (4 test cases)
- ✅ Helper functions
- ✅ Edge cases (empty MIME, zero size, uppercase)

### Verify Storage Configuration

Run the verification script to ensure everything is configured correctly:

```bash
npm run verify:storage
```

This checks:

- ✅ All bucket constants are defined
- ✅ MIME types configured for all buckets
- ✅ File size limits set for all buckets
- ✅ Validation functions work correctly
- ✅ Old bucket constants removed

## Tips

1. **Always validate** files before upload for better UX
2. **Use constants** instead of hardcoded bucket names
3. **Handle errors** gracefully with user-friendly messages
4. **Compress images** before upload when possible
5. **Use WebP** format for better compression
6. **Generate unique filenames** to avoid collisions
7. **Clean up** old files when updating
8. **Run verification** after making storage configuration changes
9. **Use retry logic** with exponential backoff for production uploads
10. **Check network status** (`navigator.onLine`) before starting uploads
11. **Add timeouts** to prevent hanging requests (30s recommended)
12. **Show progress** to users during multi-file uploads

## Common Patterns

### Avatar Upload

Avatars are uploaded to the `profiles` bucket with a consistent path pattern. A database trigger automatically updates `profiles.avatar_url` when a file is uploaded.

```typescript
const uploadAvatar = async (file: File, userId: string) => {
  const validation = validateFile(file, "PROFILES");
  if (!validation.valid) throw new Error(validation.error);

  // Get file extension from filename
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  // Use profile ID as directory: {userId}/avatar.{ext}
  const filePath = `${userId}/avatar.${ext}`;
  const { error } = await storageAPI.uploadImage({
    bucket: STORAGE_BUCKETS.PROFILES,
    filePath,
    file,
  });

  if (error) throw error;

  // Note: profiles.avatar_url is automatically updated by DB trigger
  return storageAPI.getPublicUrl({
    bucket: STORAGE_BUCKETS.PROFILES,
    path: filePath,
  });
};
```

**Using the hook (client-side):**

```typescript
import { useUploadAvatar } from "@/hooks/queries";

const { mutateAsync: uploadAvatar } = useUploadAvatar();

// Upload triggers DB trigger to update profiles.avatar_url
await uploadAvatar({ userId: user.id, file });
```

**Using Server Actions (recommended):**

```typescript
import { uploadAvatar, uploadProfileAvatar, deleteAvatar } from "@/app/actions/profile";

// Upload to 'avatars' bucket (expects 'avatar' field)
const formData = new FormData();
formData.set("avatar", file);
const result = await uploadAvatar(formData);

// Upload to 'profiles' bucket (expects 'file' field)
const formData2 = new FormData();
formData2.set("file", file);
const result2 = await uploadProfileAvatar(formData2);

// Delete avatar from both buckets
const deleteResult = await deleteAvatar();
```

> **Note:** Server actions handle validation (5MB max, JPEG/PNG/WebP/GIF), storage upload, profile update, and cache invalidation in one call.

````

### Multiple Images

```typescript
const uploadImages = async (files: File[], postId: number) => {
  const urls = await Promise.all(
    files.map(async (file, i) => {
      const ext = file.name.split(".").pop();
      const path = `${postId}/image-${i}.${ext}`;

      await storageAPI.uploadImage({
        bucket: STORAGE_BUCKETS.POSTS,
        filePath: path,
        file,
      });

      return storageAPI.getPublicUrl({
        bucket: STORAGE_BUCKETS.POSTS,
        path,
      });
    })
  );

  return urls;
};
````

### Upload with Retry (Recommended)

For production use, wrap uploads with retry logic and exponential backoff:

```typescript
const uploadWithRetry = async (
  file: File,
  filePath: string,
  retries = 2
): Promise<{ success: boolean; error?: string }> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await storageAPI.uploadImage({
        bucket: STORAGE_BUCKETS.POSTS,
        file,
        filePath,
      });

      if (result.error) {
        if (attempt === retries) {
          return { success: false, error: result.error.message };
        }
        // Exponential backoff: 1s, 2s, 3s...
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      return { success: true };
    } catch (err) {
      if (attempt === retries) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Upload failed",
        };
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return { success: false, error: "Upload failed after retries" };
};

// Usage with multiple files
const results = await Promise.all(
  files.map((file) => uploadWithRetry(file, `${postId}/${file.name}`))
);
const failed = results.filter((r) => !r.success);
if (failed.length > 0) {
  throw new Error(`Failed to upload ${failed.length} file(s)`);
}
```

### Pre-flight Checks

Always validate conditions before starting uploads:

```typescript
// Check network connectivity
if (!navigator.onLine) {
  throw new Error("No internet connection");
}

// Check authentication
if (!userId) {
  throw new Error("Please sign in to upload");
}

// Validate files
for (const file of files) {
  const validation = validateFile(file, "POSTS");
  if (!validation.valid) {
    throw new Error(validation.error);
  }
}
```

---

**For detailed documentation, see:**

- `docs/storage-buckets-config.md` - Complete configuration
- `docs/STORAGE_MIGRATION_GUIDE.md` - Migration guide
- `src/components/examples/StorageUploadExample.tsx` - Working example
