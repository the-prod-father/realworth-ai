# Deployment Checklist - Supabase Storage Optimization

## ✅ Code Changes Completed

All code changes have been made and are ready for deployment:

- [x] `app/api/appraise/route.ts` - Updated for authenticated uploads
- [x] `hooks/useAppraisal.ts` - Passes auth token to API
- [x] `services/dbService.ts` - Image cleanup on deletion
- [x] `supabase/setup_storage.sql` - Updated storage policies
- [x] `supabase/optimize_schema.sql` - Database optimizations
- [x] Documentation files created

## ⚠️ Manual Steps Required

### Step 1: Run SQL Scripts in Supabase (REQUIRED)

**You must execute these SQL scripts manually in your Supabase dashboard:**

1. **Go to Supabase Dashboard** → Your Project → SQL Editor

2. **Run `setup_storage.sql`**:
   - Copy contents from `supabase/setup_storage.sql`
   - Paste into SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - ✅ This updates storage bucket policies

3. **Run `optimize_schema.sql`**:
   - Copy contents from `supabase/optimize_schema.sql`
   - Paste into SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - ✅ This adds indexes and constraints

**Expected Results**:
- Storage bucket policies updated
- New indexes created
- Constraints added
- No errors in SQL Editor

### Step 2: Deploy Code to Vercel (AUTOMATIC or MANUAL)

**Option A: Automatic (if GitHub auto-deploy is enabled)**
- Push changes to GitHub `main` branch
- Vercel will automatically deploy
- ✅ No manual action needed

**Option B: Manual Deploy**
- Go to Vercel Dashboard → Your Project
- Click "Deployments" → "Redeploy" latest deployment
- Or trigger via GitHub push

**Expected Results**:
- Vercel build succeeds
- Deployment completes
- App is live with new code

### Step 3: Verify Environment Variables (CHECK)

**In Vercel Dashboard** → Settings → Environment Variables:

Required variables (should already exist):
- ✅ `GEMINI_API_KEY`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional (for advanced features):
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` (not required, but can be added)

**Note**: The code works without `SUPABASE_SERVICE_ROLE_KEY` - it uses user tokens instead.

### Step 4: Test the Changes (VERIFY)

**Test Checklist**:

1. **Test Authenticated Upload**:
   - [ ] Sign in with Google
   - [ ] Upload an image for appraisal
   - [ ] Check Supabase Storage → `appraisal-images` bucket
   - [ ] Verify image is in `{user_id}/temp-{timestamp}-{random}/` folder
   - [ ] Verify image URL works in browser

2. **Test Appraisal Save**:
   - [ ] Complete an appraisal
   - [ ] Verify appraisal is saved in database
   - [ ] Check `appraisals` table → `image_url` field
   - [ ] Verify image displays correctly

3. **Test Image Deletion**:
   - [ ] Delete an appraisal
   - [ ] Verify appraisal removed from database
   - [ ] Check Supabase Storage → image should be deleted
   - [ ] Verify image URL no longer works

4. **Test Unauthenticated Upload** (if applicable):
   - [ ] Sign out
   - [ ] Upload an image (should work but store in `public/` folder)
   - [ ] Verify fallback behavior works

## 🔍 Verification Steps

### Check Supabase Storage

1. Go to Supabase Dashboard → Storage → `appraisal-images`
2. Verify folder structure:
   - Should see `{user_id}/` folders (not just `public/`)
   - Each user folder contains `{appraisal_id}/` subfolders
3. Check file count and size

### Check Database

1. Go to Supabase Dashboard → Table Editor → `appraisals`
2. Verify:
   - New appraisals have `image_url` pointing to user-specific paths
   - Image URLs format: `https://.../appraisal-images/{user_id}/...`
3. Check indexes:
   - Go to Database → Indexes
   - Verify new indexes exist:
     - `idx_appraisals_image_url`
     - `idx_appraisals_user_category`
     - `idx_appraisals_price_range`
     - `idx_appraisals_references`

### Check Vercel Deployment

1. Go to Vercel Dashboard → Deployments
2. Verify:
   - Latest deployment succeeded
   - Build logs show no errors
   - Environment variables are set
3. Test live site:
   - Visit production URL
   - Sign in and test upload
   - Check browser console for errors

## 🚨 Troubleshooting

### Issue: "Storage policy violation" error

**Solution**:
1. Verify `setup_storage.sql` was run successfully
2. Check storage policies in Supabase Dashboard → Storage → Policies
3. Ensure user is authenticated when uploading

### Issue: Images not uploading

**Solution**:
1. Check browser console for errors
2. Verify auth token is being passed (check Network tab)
3. Check Supabase Storage logs
4. Verify bucket exists and policies are set

### Issue: Database errors

**Solution**:
1. Verify `optimize_schema.sql` was run
2. Check for constraint violations (price_low > price_high)
3. Verify indexes were created

### Issue: Vercel deployment fails

**Solution**:
1. Check build logs in Vercel
2. Verify environment variables are set
3. Check for TypeScript errors
4. Ensure all dependencies are in `package.json`

## 📊 Post-Deployment Monitoring

### Monitor These Metrics

1. **Supabase Storage**:
   - Bucket size
   - File count
   - Storage policies working correctly

2. **Database Performance**:
   - Query performance (should be faster with indexes)
   - Constraint violations (should be none)
   - Index usage

3. **Application**:
   - Upload success rate
   - Error rates
   - User feedback

## ✅ Completion Checklist

- [ ] SQL scripts executed in Supabase
- [ ] Code deployed to Vercel
- [ ] Environment variables verified
- [ ] Authenticated upload tested
- [ ] Image deletion tested
- [ ] Storage folder structure verified
- [ ] Database indexes verified
- [ ] No errors in production

## 📝 Notes

- **Old images**: Images in `public/` folder will continue to work
- **New images**: Will use user-specific folders automatically
- **Migration**: Optional - can migrate old images later if needed
- **Rollback**: If issues occur, old code is still in git history

---

**Status**: Code changes complete ✅ | Manual deployment steps required ⚠️

