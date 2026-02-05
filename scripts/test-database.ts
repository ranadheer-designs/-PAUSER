import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env files');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDatabase() {
  console.log('🔍 Testing Database Permissions...');
  console.log(`📡 Connecting to: ${SUPABASE_URL}`);

  try {
    // 1. Check if we can read from 'videos' table (even if empty)
    console.log('\n1️⃣  Testing READ permission on "videos" table...');
    const { data: videos, error: readError } = await supabase
      .from('videos')
      .select('count')
      .limit(1)
      .single();

    if (readError && readError.code !== 'PGRST116') { // PGRST116 is just "no rows", which is fine for permissions check
       console.error(`❌ READ Failed: ${readError.message} (Code: ${readError.code})`);
       if (readError.code === '42501') {
         console.error('   👉 SOLUTION: Run the fix-permissions.sql migration');
       }
    } else {
      console.log('✅ READ Success');
    }

    // 2. Check if we can insert (and then clean up)
    console.log('\n2️⃣  Testing INSERT permission on "videos" table...');
    const testId = `test-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('videos')
      .insert({
        youtube_id: testId,
        title: 'Database Permission Test Video',
        duration: 100
      })
      .select()
      .single();

    if (insertError) {
      console.error(`❌ INSERT Failed: ${insertError.message} (Code: ${insertError.code})`);
       if (insertError.code === '42501') {
         console.error('   👉 SOLUTION: Run the fix-permissions.sql migration');
       }
    } else {
      console.log('✅ INSERT Success');
      
      // Cleanup
      console.log('\n3️⃣  Testing DELETE permission (Cleanup)...');
      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('youtube_id', testId);
        
      if (deleteError) {
        console.error(`❌ DELETE Failed: ${deleteError.message}`);
      } else {
        console.log('✅ DELETE Success');
      }
    }

    // 3. Verify Checkpoints table
    console.log('\n4️⃣  Verifying "checkpoints" table access...');
    const { error: cpError } = await supabase.from('checkpoints').select('count').limit(1);
    if (cpError) {
       console.error(`❌ Checkpoints Table Access Failed: ${cpError.message}`);
    } else {
       console.log('✅ Checkpoints Table Access Success');
    }

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
  }
}

testDatabase();
