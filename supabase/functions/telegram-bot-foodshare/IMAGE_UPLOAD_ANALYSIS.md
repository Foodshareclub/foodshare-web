# 📸 Image Upload Analysis - Telegram Bot

## 🔍 Current State

### **What's Happening Now:**

The Telegram bot is **NOT uploading images to Supabase Storage**. Instead, it's storing Telegram's `file_id` directly in the database.

```typescript
// Current implementation (line 911)
userState.data.photo = photo.file_id;  // ❌ Just storing Telegram file_id

// Later when creating post (line 1035)
gif_url: data.photo,  // ❌ Storing file_id, not actual URL
```

---

## ❌ Problems with Current Approach

### **1. Telegram File IDs are Temporary**

- File IDs can expire
- Not guaranteed to work long-term
- Dependent on Telegram's servers

### **2. No Control Over Images**

- Can't resize/optimize images
- Can't apply watermarks
- Can't ensure availability
- Can't track storage usage

### **3. External Dependency**

- Relies on Telegram API
- Requires bot token to access
- May have rate limits
- Not truly "owned" by us

### **4. Inconsistent with Web App**

- Web app uploads to Supabase Storage
- Bot uses Telegram file_id
- Two different image systems
- Harder to maintain

---

## ✅ Recommended Solution

### **Architecture:**

```
User uploads photo to Telegram
    ↓
Bot receives photo with file_id
    ↓
Bot downloads photo from Telegram
    ↓
Bot uploads to Supabase Storage (food-images bucket)
    ↓
Bot gets public URL
    ↓
Bot stores URL in database (gif_url column)
    ↓
Post created with permanent image URL
```

---

## 🔧 Implementation Plan

### **Step 1: Download Photo from Telegram**

```typescript
async function downloadTelegramPhoto(fileId: string): Promise<Blob> {
  // Get file path from Telegram
  const fileResponse = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const fileData = await fileResponse.json();

  if (!fileData.ok) {
    throw new Error("Failed to get file info from Telegram");
  }

  const filePath = fileData.result.file_path;

  // Download the actual file
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const imageResponse = await fetch(fileUrl);

  if (!imageResponse.ok) {
    throw new Error("Failed to download image from Telegram");
  }

  return await imageResponse.blob();
}
```

### **Step 2: Upload to Supabase Storage**

```typescript
async function uploadToSupabaseStorage(
  blob: Blob,
  postId: string,
  fileExtension: string = "jpg"
): Promise<string> {
  const supabase = getSupabaseClient();

  // Generate unique filename
  const fileName = `${postId}_${Date.now()}.${fileExtension}`;
  const filePath = `posts/${fileName}`;

  // Upload to food-images bucket
  const { data, error } = await supabase.storage.from("food-images").upload(filePath, blob, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("food-images").getPublicUrl(filePath);

  return publicUrl;
}
```

### **Step 3: Update completeSharing Function**

```typescript
async function completeSharing(
  chatId: number,
  userId: number,
  description: string,
  data: any,
  lang: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, telegram_id, latitude, longitude")
    .eq("telegram_id", userId)
    .single();

  if (!profile) {
    await sendMessage(chatId, t(lang, "share.linkAccountFirst", { url: `${APP_URL}/profile` }));
    return;
  }

  // Use provided location or fall back to profile location
  const latitude = data.location?.latitude || profile.latitude;
  const longitude = data.location?.longitude || profile.longitude;
  const foodName = description.split("\n")[0].substring(0, 100);

  // Generate post ID first (for image filename)
  const postId = crypto.randomUUID();

  // Download and upload image
  let imageUrl = null;
  if (data.photo) {
    try {
      await sendMessage(chatId, t(lang, "share.uploadingImage"));

      const imageBlob = await downloadTelegramPhoto(data.photo);
      imageUrl = await uploadToSupabaseStorage(imageBlob, postId);

      console.log(`Image uploaded successfully: ${imageUrl}`);
    } catch (error) {
      console.error("Image upload error:", error);
      // Continue without image rather than failing completely
      await sendMessage(chatId, t(lang, "share.imageUploadFailed"));
    }
  }

  // Create post with uploaded image URL
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      id: postId, // Use pre-generated UUID
      profile_id: profile.id,
      post_name: foodName,
      post_description: description,
      post_type: "food",
      latitude: latitude,
      longitude: longitude,
      location: `SRID=4326;POINT(${longitude} ${latitude})`,
      post_address: data.locationText || null,
      gif_url: imageUrl, // ✅ Now using Supabase Storage URL!
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating post:", error);
    await sendMessage(chatId, t(lang, "common.error", { message: "sharing food" }));
    return;
  }

  const locationNote = !data.location && !profile.latitude ? t(lang, "share.noLocationNote") : "";

  await sendMessage(
    chatId,
    t(lang, "share.success", {
      url: `${APP_URL}/product/${post.id}`,
      locationNote,
    }),
    { reply_markup: { remove_keyboard: true } }
  );
}
```

---

## 📊 Benefits of Proper Upload

### **1. Permanent Storage** ✅

- Images stored in our Supabase bucket
- Won't expire or disappear
- Full control over retention

### **2. Optimization Opportunities** ✅

- Can resize images (save bandwidth)
- Can compress (reduce storage costs)
- Can generate thumbnails
- Can apply watermarks

### **3. Consistent Architecture** ✅

- Same storage system as web app
- Unified image management
- Easier to maintain
- Better monitoring

### **4. Better Performance** ✅

- CDN delivery via Supabase
- Faster loading times
- Better caching
- Global availability

### **5. Security & Control** ✅

- Access control via RLS
- Usage tracking
- Quota management
- Backup capabilities

---

## 🗂️ Storage Bucket Structure

### **Recommended Folder Structure:**

```
food-images/
├── posts/
│   ├── {post_uuid}_timestamp.jpg
│   ├── {post_uuid}_timestamp.jpg
│   └── ...
├── thumbnails/
│   ├── {post_uuid}_thumb.jpg
│   └── ...
└── temp/
    └── {temp_files}
```

### **Bucket Configuration:**

```typescript
// food-images bucket settings
{
  id: "food-images",
  public: true,  // ✅ Public access for viewing
  file_size_limit: 10485760,  // 10MB limit
  allowed_mime_types: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic"
  ]
}
```

---

## 🔒 Security Considerations

### **1. File Size Limits**

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (blob.size > MAX_FILE_SIZE) {
  throw new Error("File too large");
}
```

### **2. File Type Validation**

```typescript
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

if (!ALLOWED_TYPES.includes(blob.type)) {
  throw new Error("Invalid file type");
}
```

### **3. Filename Sanitization**

```typescript
// Use UUID + timestamp to prevent collisions
const fileName = `${postId}_${Date.now()}.jpg`;
```

### **4. Rate Limiting**

```typescript
// Limit uploads per user per hour
const uploadCount = await getUploadCount(userId, 3600);
if (uploadCount > 10) {
  throw new Error("Upload limit exceeded");
}
```

---

## 💰 Cost Considerations

### **Telegram File Storage (Current):**

- ✅ Free
- ❌ Temporary
- ❌ No control
- ❌ External dependency

### **Supabase Storage (Recommended):**

- ✅ Permanent
- ✅ Full control
- ✅ CDN delivery
- 💰 Cost: ~$0.021/GB/month storage + $0.09/GB bandwidth

**Example Cost:**

- 1,000 posts with 500KB images = 500MB storage
- Cost: ~$0.01/month storage
- Bandwidth: 10,000 views = 5GB = $0.45/month
- **Total: ~$0.46/month for 1,000 posts**

---

## 🚀 Migration Strategy

### **Phase 1: Implement New Upload System**

1. Add image download function
2. Add Supabase upload function
3. Update completeSharing to use new system
4. Test with new posts

### **Phase 2: Backward Compatibility**

1. Keep existing file_id support
2. Detect if gif_url is file_id or URL
3. Handle both cases in display logic

### **Phase 3: Migrate Existing Posts** (Optional)

1. Find posts with Telegram file_ids
2. Download images from Telegram
3. Upload to Supabase
4. Update gif_url column
5. Run as background job

---

## 📝 Translation Keys Needed

Add to `locales/en.ts` and `locales/ru.ts`:

```typescript
share: {
  // ... existing keys
  uploadingImage: "📤 Uploading image...",
  imageUploadFailed: "⚠️ Image upload failed, but your post was created. You can add an image later.",
}
```

---

## 🧪 Testing Checklist

### **Test Cases:**

- [ ] Upload JPEG image
- [ ] Upload PNG image
- [ ] Upload WebP image
- [ ] Upload large image (>10MB) - should fail gracefully
- [ ] Upload invalid file type - should fail gracefully
- [ ] Network error during download - should handle gracefully
- [ ] Network error during upload - should handle gracefully
- [ ] Verify image appears in Supabase Storage
- [ ] Verify public URL works
- [ ] Verify image displays in web app
- [ ] Verify image displays in bot /find results

---

## 🎯 Recommendation

### **Should We Implement This?**

**YES!** ✅

**Priority: HIGH**

**Reasons:**

1. **Reliability** - Telegram file_ids are not permanent
2. **Consistency** - Match web app architecture
3. **Control** - Full ownership of images
4. **Performance** - CDN delivery
5. **Features** - Enable image optimization

**Estimated Effort:** 4-6 hours

- 2 hours: Implementation
- 1 hour: Testing
- 1 hour: Translation
- 1-2 hours: Edge cases & error handling

---

## 📋 Implementation Checklist

- [ ] Add `downloadTelegramPhoto()` function
- [ ] Add `uploadToSupabaseStorage()` function
- [ ] Update `completeSharing()` to use new upload
- [ ] Add translation keys
- [ ] Add error handling
- [ ] Add file validation
- [ ] Test with various image types
- [ ] Test error scenarios
- [ ] Update documentation
- [ ] Deploy to production

---

## 🎉 Conclusion

**Current State:** ❌ Storing Telegram file_ids (temporary, unreliable)  
**Recommended:** ✅ Upload to Supabase Storage (permanent, reliable)

**Next Step:** Implement proper image upload system for production-ready, reliable image storage.

Would you like me to implement this now?
