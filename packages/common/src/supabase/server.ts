import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Creates a server-side Supabase client with admin privileges.
 * WARNING: This client uses the SERVICE ROLE KEY.
 * NEVER expose this client or the key to the browser.
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
