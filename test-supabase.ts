// Test Supabase connection and RLS policies
// Run with: node --loader ts-node/esm test-supabase.ts

import { createClient } from './apps/web/src/lib/supabase/client';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  const supabase = createClient();
  
  // Test 1: Basic connection
  console.log('1. Testing basic connection...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Connection successful!\n');
  } catch (err: any) {
    console.log('❌ Connection failed:', err.message);
    return;
  }
  
  // Test 2: Check contents table
  console.log('2. Checking contents table...');
  try {
    const { data, error } = await supabase
      .from('contents')
      .select('id, external_id, title')
      .limit(5);
    
    if (error) throw error;
    console.log('✅ Can read contents table');
    console.log(`   Found ${data?.length || 0} content records`);
    if (data && data.length > 0) {
      console.log('   Sample:', data[0]);
    }
  } catch (err: any) {
    console.log('❌ Error reading contents:', err.message);
  }
  
  // Test 3: Try to insert (will fail if RLS policy not set)
  console.log('\n3. Testing INSERT permission on contents table...');
  try {
    const { data, error } = await supabase
      .from('contents')
      .insert({
        type: 'video',
        external_id: 'TEST_' + Date.now(),
        title: 'Test Video',
      })
      .select();
    
    if (error) throw error;
    
    console.log('✅ Can insert into contents table');
    
    // Clean up
    if (data && data[0]) {
      await supabase.from('contents').delete().eq('id', data[0].id);
      console.log('   Cleaned up test data');
    }
  } catch (err: any) {
    if (err.code === '42501') {
      console.log('❌ RLS Policy Error: Cannot insert into contents table');
      console.log('   Error code:', err.code);
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('   Go to Supabase Dashboard → SQL Editor');
      console.log('   Run this SQL:');
      console.log('');
      console.log('   CREATE POLICY "Allow authenticated users to insert contents"');
      console.log('   ON public.contents FOR INSERT TO authenticated WITH CHECK (true);');
    } else {
      console.log('❌ Insert failed:', err.message);
    }
  }
  
  // Test 4: Check notes table
  console.log('\n4. Checking notes table...');
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('id, body, content_id')
      .limit(5);
    
    if (error) throw error;
    console.log('✅ Can read notes table');
    console.log(`   Found ${data?.length || 0} notes in Supabase`);
  } catch (err: any) {
    console.log('❌ Error reading notes:', err.message);
  }
  
  console.log('\n✅ Connection test complete!');
}

testConnection().catch(console.error);
