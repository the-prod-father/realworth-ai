# Supabase Setup Guide for RealWorth.ai

This guide walks you through setting up Supabase for RealWorth.ai's authentication and database.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub (or create an account)
4. Click "New project"
5. Fill in project details:
   - **Name**: realworth-ai
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start
6. Click "Create new project"
7. Wait 2-3 minutes for project to provision

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, click "Settings" (gear icon in sidebar)
2. Click "API" in the settings menu
3. Copy these values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **Anon public** key (starts with: `eyJhbGc...`)

4. Add these to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

## Step 3: Set Up Database Schema

1. In Supabase dashboard, click "SQL Editor" in sidebar
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify success: You should see "Success. No rows returned"

This creates:
- `users` table for user profiles
- `appraisals` table for appraisal history
- Row Level Security (RLS) policies
- Automatic triggers for timestamps and user creation

## Step 4: Configure Google OAuth Provider

1. In Supabase dashboard, go to "Authentication" > "Providers"
2. Find "Google" in the list and click to expand
3. Toggle "Enable Google provider" to ON
4. Enter your Google OAuth credentials:
   - **Client ID**: Your existing `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - **Client Secret**: Your existing `GOOGLE_CLIENT_SECRET`

5. Add authorized redirect URLs in Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Select your OAuth 2.0 Client ID
   - Under "Authorized redirect URIs", add:
     ```
     https://your-project.supabase.co/auth/v1/callback
     ```
   - Keep existing JavaScript origins:
     - `http://localhost:3001`
     - `https://real-worth.vercel.app`
     - `https://realworth.ai` (after DNS setup)

6. Save changes in both Supabase and Google Cloud Console

## Step 5: Verify Tables Were Created

1. In Supabase dashboard, click "Table Editor" in sidebar
2. You should see two tables:
   - `users` (with columns: id, email, name, picture, created_at, updated_at)
   - `appraisals` (with columns: id, user_id, item_name, author, era, category, etc.)

3. Click on each table to verify the structure matches `schema.sql`

## Step 6: Test RLS Policies

1. In "Table Editor", try to insert a row manually
2. You should see an error (this is good - RLS is working!)
3. RLS ensures users can only access their own data

## Step 7: Configure Storage (Optional - for Future)

Currently, we store images as base64 data URLs in the database. For production, you may want to use Supabase Storage:

1. Go to "Storage" in sidebar
2. Click "Create a new bucket"
3. Name it `appraisal-images`
4. Set to "Private" (users can only access their own images)
5. Update the code to upload images to storage instead of base64

## Step 8: Add Environment Variables to Vercel

1. Go to [vercel.com](https://vercel.com/dashboard)
2. Select your `real-worth` project
3. Go to "Settings" > "Environment Variables"
4. Add these new variables:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: Your Supabase project URL
   - Environment: Production (and Preview if you want)

   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: Your Supabase anon key
   - Environment: Production (and Preview if you want)

5. Click "Save"
6. Redeploy your app (Vercel will do this automatically or go to "Deployments" > "Redeploy")

## Step 9: Test Authentication Flow

1. Start your local dev server: `npm run dev`
2. Go to `http://localhost:3001`
3. Click "Sign In with Google"
4. Complete OAuth flow
5. Check Supabase dashboard:
   - Go to "Authentication" > "Users"
   - Your user should appear in the list
   - Go to "Table Editor" > "users"
   - Your user profile should be automatically created

## Step 10: Test Appraisal Storage

1. While signed in, create a new appraisal
2. Upload an image and fill in details
3. Submit the appraisal
4. Check Supabase dashboard:
   - Go to "Table Editor" > "appraisals"
   - Your appraisal should be saved
   - Refresh the app - your appraisal history should load

## Troubleshooting

### Error: "Missing Supabase environment variables"
**Solution**: Ensure `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Error: "Failed to fetch user info"
**Solution**: Check that Google OAuth is properly configured in Supabase and redirect URLs are correct

### Error: "Row Level Security policy violation"
**Solution**: Ensure you're signed in and the RLS policies are set up correctly via `schema.sql`

### User created in auth.users but not in public.users table
**Solution**: Check that the `on_auth_user_created` trigger is set up correctly in `schema.sql`

### Images not displaying
**Solution**: Check that `image_url` is properly saved in the database. Consider migrating to Supabase Storage for better performance.

## Security Best Practices

1. **Never commit `.env.local`** to git (it's in `.gitignore`)
2. **Never expose your service_role key** (we only use anon key)
3. **Always use RLS policies** (already set up in schema.sql)
4. **Rotate keys** if accidentally exposed
5. **Use Supabase Storage** for production images (not base64)

## Monitoring & Maintenance

1. **Monitor usage**: Supabase dashboard > "Settings" > "Usage"
2. **Check logs**: "Logs" tab shows queries and errors
3. **Database backups**: Free tier has automatic daily backups
4. **Upgrade if needed**: Monitor "Database" tab for size/performance

## Next Steps

After Supabase is set up:
- [ ] Migrate existing localStorage data (if any)
- [ ] Implement image upload to Supabase Storage
- [ ] Add pagination for appraisal history
- [ ] Set up real-time subscriptions for live updates
- [ ] Configure email templates for auth
- [ ] Add export feature (PDF/CSV)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
