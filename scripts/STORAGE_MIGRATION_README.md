# Storage Migration Guide

## Overview

This script migrates files from the `avatars` and `posts` storage buckets into the `users` bucket with an organized directory structure.

## Structure After Migration

```
users/
├── avatars/
│   └── [all files from avatars bucket]
└── posts/
    └── [all files from posts bucket]
```

## Prerequisites

1. **Environment Variables**: Ensure `.env.local` contains:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Service Role Key**: You need the service role key (not the anon key) for this operation.
   - Find it in Supabase Dashboard → Settings → API → Service Role Key

## Running the Migration

### Step 1: Dry Run (Recommended)

First, run the script to see what will happen without deleting files:

```bash
npm run migrate:storage
```

This will:

- ✅ Copy all files from `avatars` → `users/avatars/`
- ✅ Copy all files from `posts` → `users/posts/`
- ❌ NOT delete original files (safe mode)

### Step 2: Review the Output

Check the migration summary:

- Total files found
- Successful migrations
- Failed migrations (if any)

### Step 3: Verify in Supabase Dashboard

1. Go to Supabase Dashboard → Storage → `users` bucket
2. Verify files are in the correct locations:
   - `users/avatars/...`
   - `users/posts/...`

### Step 4: Delete Original Files (Optional)

If you want to delete files from the original buckets after migration:

1. Edit `scripts/migrate-storage-to-users-bucket.ts`
2. Change `DELETE_AFTER_MIGRATION = false` to `DELETE_AFTER_MIGRATION = true`
3. Run again: `npm run migrate:storage`

## What the Script Does

1. **Lists all files** in source buckets (including nested directories)
2. **Downloads each file** from the source bucket
3. **Uploads to target bucket** with the new path structure
4. **Optionally deletes** from source (if enabled)
5. **Provides detailed logs** of each operation

## Safety Features

- ✅ **Non-destructive by default** - Original files remain unless you enable deletion
- ✅ **Detailed logging** - See exactly what's happening
- ✅ **Error handling** - Failed migrations are logged but don't stop the process
- ✅ **Upsert mode** - Won't fail if file already exists in target

## Troubleshooting

### "Missing required environment variables"

Make sure `.env.local` has both:

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### "Failed to download" errors

- Check that the source bucket exists and has files
- Verify your service role key has storage permissions

### "Failed to upload" errors

- Check that the `users` bucket exists
- Verify storage policies allow uploads
- Check if you have sufficient storage quota

## After Migration

### Update Your Code

You'll need to update any code that references the old bucket paths:

**Before:**

```typescript
// Old paths
supabase.storage.from('avatars').upload(...)
supabase.storage.from('posts').upload(...)
```

**After:**

```typescript
// New paths
supabase.storage.from('users').upload(`avatars/${filename}`, ...)
supabase.storage.from('users').upload(`posts/${filename}`, ...)
```

### Update Storage Policies

If you have RLS policies on the old buckets, you'll need to create equivalent policies for the `users` bucket.

Example policy for user avatars:

```sql
-- Allow users to upload their own avatars
CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'users' AND
  (storage.foldername(name))[1] = 'avatars' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to read all avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'users' AND
  (storage.foldername(name))[1] = 'avatars'
);
```

## Rollback

If something goes wrong and you need to rollback:

1. The original files are still in the source buckets (unless you enabled deletion)
2. You can delete files from the `users` bucket manually or via script
3. Your application will continue working with the old bucket structure

## Questions?

- Check Supabase Storage docs: https://supabase.com/docs/guides/storage
- Review the script code: `scripts/migrate-storage-to-users-bucket.ts`
