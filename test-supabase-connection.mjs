import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tjyefdpmqwffcoujpjek.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeWVmZHBtcXdmZmNvdWpwamVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTg3NzIsImV4cCI6MjA4NDEzNDc3Mn0.Z1qkICVwDOdHxYqR0aL8k3zmcn6PfJFncHLHaab-MwY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Test 1: Basic connection
  console.log('1. Testing basic connection...');
  const { data: healthCheck, error: healthError } = await supabase
    .from('profiles')
    .select('count')
    .limit(1);
  
  if (healthError) {
    console.log('❌ Connection failed:', healthError.message);
    return;
  }
  console.log('✅ Connection successful!\n');
  
  // Test 2: Check contents table policies
  console.log('2. Checking contents table policies...');
  const { data: contents, error: contentsError } = await supabase
    .from('contents')
    .select('id, external_id')
    .limit(1);
  
  if (contentsError) {
    console.log('❌ Error reading contents:', contentsError.message);
  } else {
    console.log('✅ Can read contents table');
    console.log('   Found contents:', contents?.length || 0);
  }
  
  // Test 3: Try to insert a test content (will fail if RLS policy not set)
  console.log('\n3. Testing INSERT permission on contents table...');
  const { data: insertTest, error: insertError } = await supabase
    .from('contents')
    .insert({
      type: 'video',
      external_id: 'TEST_VIDEO_ID_12345',
      title: 'Test Video',
      description: 'Test description',
    })
    .select();
  
  if (insertError) {
    if (insertError.code === '42501') {
      console.log('❌ RLS Policy Error: Cannot insert into contents table');
      console.log('   Error code:', insertError.code);
      console.log('   Message:', insertError.message);
      console.log('\n⚠️  ACTION REQUIRED: Run this SQL in Supabase Dashboard:');
      console.log('   CREATE POLICY "Allow authenticated users to insert contents"');
      console.log('   ON public.contents FOR INSERT TO authenticated WITH CHECK (true);');
    } else {
      console.log('❌ Insert failed:', insertError.message);
    }
  } else {
    console.log('✅ Can insert into contents table');
    console.log('   Inserted test content:', insertTest);
    
    // Clean up test data
    if (insertTest && insertTest[0]) {
      await supabase.from('contents').delete().eq('id', insertTest[0].id);
      console.log('   Cleaned up test data');
    }
  }
  
  // Test 4: Check notes table
  console.log('\n4. Checking notes table...');
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, body, content_id')
    .limit(5);
  
  if (notesError) {
    console.log('❌ Error reading notes:', notesError.message);
  } else {
    console.log('✅ Can read notes table');
    console.log('   Found notes:', notes?.length || 0);
    if (notes && notes.length > 0) {
      console.log('   Sample note:', notes[0]);
    }
  }
  
  console.log('\n✅ Connection test complete!');
}

testConnection().catch(console.error);
