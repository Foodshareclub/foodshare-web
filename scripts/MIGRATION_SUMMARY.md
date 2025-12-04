# Storage Migration Summary

## Migration Status: Partially Complete

### ✅ Avatars Bucket → users/avatars/

**Status**: Successfully migrated (with some exceptions)

- **Total files found**: 122
- **Successfully migrated**: ~90 files
- **Failed**: ~32 files (mostly corrupted or inaccessible files)
- **Structure**: All avatar files now exist in `users/avatars/{user_id}/{filename}`

### ❌ Posts Bucket → users/posts/

**Status**: Failed - Bucket configuration issue

- **Total files found**: 180
- **Error**: "Bucket not found" (404) when uploading to `users` bucket
- **Cause**: The `users` bucket may have RLS policies blocking uploads or incorrect configuration

## Current Storage State

```
Bucket: avatars
- Files: 122
- Size: 95 MB
- Status: Original files still intact

Bucket: posts
- Files: 180
- Size: 81 MB
- Status: Original files still intact

Bucket: users
- Files: 400
- Size: 371 MB
- Status: Contains migrated avatars + existing files
```

## Issues Encountered

### 1. Corrupted/Inaccessible Files

Some files in the avatars bucket couldn't be downloaded:

- Files in `44e079c3-8da0-462c-abe8-40155e7b2502/` (many .jpg files)
- Files in `a03eaa06-803c-4408-b461-7920cdcc15fb/` (various formats)
- Files in `b57f61eb-bcde-42a3-a2dd-038caaf24ceb/` (many files)
- Files in `cuties/` folder
- Some individual user avatar files

These files may be:

- Corrupted in the original bucket
- Have permission issues
- Were deleted but metadata remains

### 2. Network Errors

Occasional network errors during upload:

- `EPIPE` errors (broken pipe)
- `ECONNRESET` errors (connection reset)
- Socket closed errors

These are transient and could be retried.

### 3. Posts Migration Failure

All posts uploads failed with "Bucket not found" error. This indicates:

- RLS policies on `users` bucket may be blocking service role uploads
- Bucket configuration issue
- Path structure issue

## Next Steps

### Option 1: Fix RLS Policies (Recommended)

Check and update RLS policies on the `users` bucket:

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Allow service role to upload
CREATE POLICY "Service role can upload to users bucket"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'users');

-- Allow service role to read
CREATE POLICY "Service role can read from users bucket"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'users');
```

### Option 2: Re-run Migration for Posts Only

After fixing RLS policies, modify the script to only migrate posts:

```typescript
// Comment out avatars migration
// const avatarsStats = await migrateBucket('avatars', 'users', 'avatars', DELETE_AFTER_MIGRATION);

// Only run posts migration
const postsStats = await migrateBucket("posts", "users", "posts", DELETE_AFTER_MIGRATION);
```

### Option 3: Retry Failed Avatar Files

Create a retry script for the ~32 failed avatar files once the underlying issues are resolved.

## Verification Queries

```sql
-- Count files in each bucket
SELECT
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM(COALESCE((metadata->>'size')::bigint, 0))) as total_size
FROM storage.objects
WHERE bucket_id IN ('avatars', 'posts', 'users')
GROUP BY bucket_id;

-- Check migrated avatars
SELECT COUNT(*)
FROM storage.objects
WHERE bucket_id = 'users' AND name LIKE 'avatars/%';

-- Check migrated posts (should be 0 currently)
SELECT COUNT(*)
FROM storage.objects
WHERE bucket_id = 'users' AND name LIKE 'posts/%';

-- List RLS policies on storage.objects
SELECT *
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage';
```

## Recommendations

1. **Fix RLS policies** on the `users` bucket to allow service role access
2. **Re-run posts migration** after fixing policies
3. **Investigate corrupted files** - determine if they're needed or can be cleaned up
4. **Update application code** to use new paths:
   - Old: `avatars/{user_id}/{filename}`
   - New: `users/avatars/{user_id}/{filename}`
   - Old: `posts/{post_id}/{filename}`
   - New: `users/posts/{post_id}/{filename}`

5. **Test thoroughly** before deleting original files
6. **Keep original buckets** until migration is 100% verified

## Files Created

- `scripts/migrate-storage-to-users-bucket.ts` - Migration script
- `scripts/STORAGE_MIGRATION_README.md` - Detailed instructions
- `scripts/MIGRATION_SUMMARY.md` - This summary
- `migration-output.log` - Migration logs
- `migration-final.log` - Final migration attempt logs
