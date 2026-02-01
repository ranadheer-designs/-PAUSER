import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Creates a browser-safe Supabase client.
 * This client only uses the public anonymous key and is safe to use in client-side code.
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
