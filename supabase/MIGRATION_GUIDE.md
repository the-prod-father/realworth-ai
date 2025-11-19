# Supabase Storage Migration Guide

This guide will help you migrate from the old public folder storage to the new user-specific folder structure.

## Overview

**Old Structure**: `public/{timestamp}-{random}.{ext}`  
**New Structure**: `{user_id}/{appraisal_id}/{filename}`

## Benefits

1. **User Isolation**: Each user's images are in their own folder
2. **Better Security**: Storage policies enforce user ownership
3. **Easier Cleanup**: Can delete entire user folders when needed
4. **Better Organization**: Images are organized by user and appraisal

## Migration Steps

### Step 1: Run Storage Setup

Execute `setup_storage.sql` in your Supabase SQL Editor:

```sql
-- This creates the optimized storage bucket with user-specific policies
-- See supabase/setup_storage.sql
```

### Step 2: Run Schema Optimizations

Execute `optimize_schema.sql` in your Supabase SQL Editor:

```sql
-- This adds indexes and constraints for better performance
-- See supabase/optimize_schema.sql
```

### Step 3: Update Environment Variables

Add the service role key to your environment (optional, for advanced operations):

```bash
# In .env.local (local development)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# In Vercel (production)
# Add via Vercel dashboard > Settings > Environment Variables
```

**Note**: The service role key is optional. The API route will work with user access tokens.

### Step 4: Deploy Code Changes

The following files have been updated:

1. **`app/api/appraise/route.ts`**
   - Now accepts auth token from request header
   - Stores images in user-specific folders when authenticated
   - Falls back to public folder for unauthenticated users

2. **`hooks/useAppraisal.ts`**
   - Passes auth token to API route
   - Handles authenticated requests properly

3. **`services/dbService.ts`**
   - Added image cleanup on appraisal deletion
   - Handles storage URLs properly

4. **`supabase/setup_storage.sql`**
   - Updated storage policies for user-specific access
   - Added file size limits and MIME type restrictions

### Step 5: Test the Migration

1. **Test Authenticated Upload**:
   - Sign in with Google
   - Upload an image for appraisal
   - Verify image is stored in `{user_id}/temp-{timestamp}-{random}/{filename}`

2. **Test Appraisal Save**:
   - Complete an appraisal
   - Verify image URL is saved in database
   - Check that image is accessible

3. **Test Image Deletion**:
   - Delete an appraisal
   - Verify image is removed from storage

### Step 6: Migrate Existing Images (Optional)

If you have existing images in the `public/` folder, you can migrate them:

```sql
-- This is a manual process - you'll need to:
-- 1. Query all appraisals with image_url in public/ folder
-- 2. For each appraisal:
--    a. Download the image
--    b. Upload to new location: {user_id}/{appraisal_id}/{filename}
--    c. Update image_url in database
--    d. Delete old image

-- Example query to find old images:
SELECT id, user_id, image_url 
FROM appraisals 
WHERE image_url LIKE '%/public/%';
```

**Note**: This migration is optional. Old images will continue to work, but new uploads will use the new structure.

## Storage Policies Explained

### Upload Policy
- **Who**: Authenticated users
- **Where**: `{user_id}/*` folders only
- **What**: Images (JPEG, PNG, WebP, GIF)
- **Size Limit**: 50MB

### Read Policy
- **Who**: 
  - Authenticated users (their own images)
  - Public (all images for sharing)
- **Why**: Allows public URLs for sharing appraisals

### Delete Policy
- **Who**: Authenticated users
- **What**: Their own images only
- **Enforced**: By folder structure (`{user_id}/...`)

## Troubleshooting

### Issue: "Storage policy violation"

**Solution**: Ensure the user is authenticated and the image path starts with their user ID.

### Issue: "Image not found after upload"

**Solution**: Check that the storage bucket exists and policies are set correctly.

### Issue: "Cannot delete image"

**Solution**: Verify the user owns the image (path starts with their user ID).

## Performance Considerations

### Indexes Added
- `idx_appraisals_image_url` - Faster image URL lookups
- `idx_appraisals_user_category` - Faster category filtering
- `idx_appraisals_price_range` - Faster value-based queries
- `idx_appraisals_references` - Faster JSON queries

### Storage Optimizations
- File size limit: 50MB
- MIME type restrictions: Images only
- Cache control: 3600 seconds (1 hour)

## Security Improvements

1. **User Isolation**: Images are stored in user-specific folders
2. **Policy Enforcement**: Storage policies enforce user ownership
3. **RLS Integration**: Works with Row Level Security
4. **Public Access**: Controlled public read access for sharing

## Next Steps

1. Monitor storage usage in Supabase dashboard
2. Set up storage lifecycle policies (optional)
3. Consider image compression before upload
4. Implement CDN for faster image delivery (future)

---

**Migration Complete!** Your storage is now optimized for user-specific access and better performance.

