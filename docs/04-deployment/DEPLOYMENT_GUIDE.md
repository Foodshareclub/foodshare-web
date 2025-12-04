# 🚀 Storage System Deployment Guide

## Pre-Deployment Checklist

### ✅ Code Verification

- [x] All TypeScript files compile without errors
- [x] Storage constants defined and exported
- [x] Validation functions working
- [x] Edge function updated with validation
- [x] Components using new constants
- [x] Verification script passes

### ✅ Testing Checklist

Run these tests before deploying:

```bash
# 1. Verify storage system
npm run verify:storage

# 2. Type check
npm run type-check

# 3. Build test
npm run build

# 4. Preview build
npm run preview
```

---

## Deployment Steps

### Step 1: Deploy Edge Function

```bash
# Navigate to project root
cd /path/to/foodshare

# Deploy the resize function
supabase functions deploy resize-tinify-upload-image

# Verify deployment
supabase functions list
```

**Expected Output:**

```
┌──────────────────────────────────┬─────────┬────────────────────┐
│ NAME                             │ STATUS  │ UPDATED AT         │
├──────────────────────────────────┼─────────┼────────────────────┤
│ resize-tinify-upload-image       │ ACTIVE  │ 2024-12-01 ...     │
└──────────────────────────────────┴─────────┴────────────────────┘
```

### Step 2: Deploy Client Application

#### Option A: Vercel (Recommended)

```bash
# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod

# Or use Vercel CLI
vercel deploy --prod
```

#### Option B: Manual Deployment

```bash
# Build
npm run build

# The build/ directory contains your production files
# Upload to your hosting provider
```

### Step 3: Verify Deployment

#### Test Edge Function

```bash
# Test the resize function endpoint
curl -X POST https://your-project.supabase.co/functions/v1/resize-tinify-upload-image \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: image/jpeg" \
  --data-binary @test-image.jpg
```

#### Test Client Application

1. Open your deployed app
2. Navigate to profile settings
3. Try uploading an avatar
4. Verify validation works (try invalid file type)
5. Check that upload succeeds with valid image

---

## Post-Deployment Verification

### 1. Test Avatar Upload

- [ ] Navigate to profile page
- [ ] Click avatar upload
- [ ] Select valid image (JPEG/PNG/WebP)
- [ ] Verify upload succeeds
- [ ] Check image appears correctly

### 2. Test Post Image Upload

- [ ] Create new food listing
- [ ] Upload food image
- [ ] Verify validation works
- [ ] Check image displays correctly

### 3. Test Validation

- [ ] Try uploading .exe file → Should be rejected
- [ ] Try uploading oversized file → Should be rejected
- [ ] Try uploading invalid MIME type → Should be rejected
- [ ] Verify error messages are user-friendly

### 4. Check Browser Console

- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No network errors
- [ ] Validation messages appear correctly

### 5. Monitor Supabase Dashboard

- [ ] Check Storage usage
- [ ] Verify files in correct buckets
- [ ] Check Edge Function logs
- [ ] Monitor for errors

---

## Rollback Plan

If issues occur, you can rollback:

### Rollback Edge Function

```bash
# List function versions
supabase functions list --version

# Rollback to previous version
supabase functions deploy resize-tinify-upload-image --version <previous-version>
```

### Rollback Client Code

```bash
# Revert to previous commit
git revert HEAD

# Rebuild and redeploy
npm run build
vercel --prod
```

---

## Environment Variables

Ensure these are set in your deployment environment:

### Client (.env)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Edge Function (Supabase Dashboard)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
TINIFY_API_KEY=your-tinify-key
```

**Set via Supabase CLI:**

```bash
supabase secrets set TINIFY_API_KEY=your-key
```

---

## Monitoring

### What to Monitor

1. **Storage Usage**
   - Dashboard → Storage → Usage
   - Watch for unusual spikes
   - Monitor bucket sizes

2. **Edge Function Logs**
   - Dashboard → Edge Functions → Logs
   - Check for validation errors
   - Monitor success rate

3. **Error Tracking**
   - Client-side errors (Sentry/LogRocket)
   - Server-side errors (Supabase logs)
   - User reports

### Key Metrics

- Upload success rate (should be >95%)
- Validation rejection rate
- Average upload time
- Storage growth rate

---

## Troubleshooting

### Issue: Edge Function Returns 500

**Cause:** Missing environment variables

**Solution:**

```bash
# Check secrets
supabase secrets list

# Set missing secrets
supabase secrets set TINIFY_API_KEY=your-key
```

### Issue: Validation Not Working

**Cause:** Old client code cached

**Solution:**

1. Clear browser cache
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Check Network tab for correct bundle version

### Issue: Files Upload to Wrong Bucket

**Cause:** Code not using new constants

**Solution:**

1. Verify `STORAGE_BUCKETS` import
2. Check component code
3. Rebuild and redeploy

### Issue: MIME Type Rejected

**Cause:** File type not in allowed list

**Solution:**

1. Check `ALLOWED_MIME_TYPES` in `storage.ts`
2. Add new MIME type if needed
3. Update documentation
4. Redeploy

---

## Performance Optimization

### After Deployment

1. **Enable CDN Caching**
   - Configure Supabase Storage CDN
   - Set appropriate cache headers
   - Use image transformations

2. **Monitor Bundle Size**

   ```bash
   npm run build
   # Check build/assets/*.js sizes
   ```

3. **Optimize Images**
   - Ensure resize function is working
   - Check compressed file sizes
   - Monitor Tinify API usage

4. **Database Indexes**
   - Verify indexes on storage-related queries
   - Monitor query performance

---

## Security Checklist

### Post-Deployment Security

- [ ] Verify RLS policies on storage buckets
- [ ] Check CORS configuration
- [ ] Validate authentication requirements
- [ ] Test unauthorized access attempts
- [ ] Review bucket permissions
- [ ] Monitor for abuse patterns

### Bucket Security Settings

Check in Supabase Dashboard → Storage:

1. **Public Access:** Only for necessary buckets
2. **File Size Limits:** Configured per bucket
3. **MIME Type Restrictions:** Enforced
4. **RLS Policies:** Active and tested

---

## Success Criteria

Deployment is successful when:

- ✅ All tests pass
- ✅ Edge function deploys without errors
- ✅ Client application loads correctly
- ✅ Avatar upload works
- ✅ Post image upload works
- ✅ Validation rejects invalid files
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ Storage buckets receiving files correctly
- ✅ Monitoring shows healthy metrics

---

## Next Steps After Deployment

### Immediate (Week 1)

1. Monitor error rates closely
2. Gather user feedback
3. Watch storage usage
4. Check performance metrics

### Short-term (Month 1)

1. Add client-side validation to remaining forms
2. Implement upload progress indicators
3. Add image compression before upload
4. Create automated tests

### Long-term (Quarter 1)

1. Implement thumbnail generation
2. Add image optimization pipeline
3. Consider CDN integration
4. Implement storage cleanup automation

---

## Support Resources

### Documentation

- Quick Reference: `docs/STORAGE_QUICK_REFERENCE.md`
- Migration Guide: `docs/STORAGE_MIGRATION_GUIDE.md`
- Investigation Report: `docs/DEEP_INVESTIGATION_REPORT.md`

### Code Examples

- Example Component: `src/components/examples/StorageUploadExample.tsx`
- Storage Constants: `src/constants/storage.ts`
- Storage API: `src/api/storageAPI.ts`

### Verification

```bash
npm run verify:storage
```

---

## Contact & Escalation

### For Issues

1. Check documentation first
2. Review error logs
3. Test in development environment
4. Check Supabase status page
5. Review recent commits

### Emergency Rollback

If critical issues occur:

1. Rollback client deployment immediately
2. Rollback edge function if needed
3. Notify team
4. Document issue
5. Fix in development
6. Test thoroughly
7. Redeploy

---

## Deployment Checklist Summary

### Pre-Deployment

- [x] Code verified
- [x] Tests passing
- [x] Documentation complete
- [x] Environment variables set

### Deployment

- [ ] Edge function deployed
- [ ] Client application deployed
- [ ] DNS configured (if needed)
- [ ] SSL certificate active

### Post-Deployment

- [ ] Functionality tested
- [ ] Validation working
- [ ] No errors in console
- [ ] Monitoring active
- [ ] Team notified

### Follow-up

- [ ] Monitor for 24 hours
- [ ] Gather user feedback
- [ ] Document any issues
- [ ] Plan next improvements

---

**Deployment Date:** **\*\***\_**\*\***

**Deployed By:** **\*\***\_**\*\***

**Version:** **\*\***\_**\*\***

**Status:** ⬜ Success ⬜ Issues ⬜ Rollback

**Notes:**

---

---

---

---

_This deployment guide ensures a smooth, safe deployment of the modernized storage system._
