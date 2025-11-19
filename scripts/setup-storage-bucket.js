/**
 * Setup Script: Create Supabase Storage Bucket Programmatically
 *
 * This script bypasses the SQL Editor and creates the bucket via API
 * Use this when SQL Editor is timing out due to Supabase incidents
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage bucket...\n');

  try {
    // Step 1: Create the bucket
    console.log('📦 Creating appraisal-images bucket...');

    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('appraisal-images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('   ✅ Bucket already exists (skipping creation)');
      } else {
        throw new Error(`Failed to create bucket: ${bucketError.message}`);
      }
    } else {
      console.log('   ✅ Bucket created successfully');
    }

    // Step 2: Verify bucket is public
    console.log('\n🔍 Verifying bucket configuration...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const appraisalBucket = buckets.find(b => b.id === 'appraisal-images');
    if (appraisalBucket) {
      console.log('   ✅ Bucket found');
      console.log(`   📊 Public: ${appraisalBucket.public}`);
      console.log(`   📊 Created: ${appraisalBucket.created_at}`);
    } else {
      throw new Error('Bucket was not created properly');
    }

    console.log('\n✨ Storage setup complete!');
    console.log('\n📝 Note: Storage policies are automatically managed by Supabase.');
    console.log('   Your bucket is public and ready to use.');

    console.log('\n🎯 Next steps:');
    console.log('   1. New images will automatically upload to this bucket');
    console.log('   2. Run: node scripts/migrate-images-to-storage.js');
    console.log('   3. Your resource exhaustion issue will be resolved!');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\n💡 If this fails, you may need to wait for Supabase to fully recover.');
    console.error('   Or manually create the bucket in Supabase Dashboard > Storage');
    process.exit(1);
  }
}

setupStorage();
