'use server';

/**
 * Credit Management Server Actions
 * 
 * Handles user credit operations for checkpoint monetization.
 * Note: user_credits table is created via migration - using `as any` for type safety
 */

import { createClient } from '@/utils/supabase/server';

export interface UserCredits {
  credits: number;
  totalUsed: number;
}

/**
 * Get current user's credits
 */
export async function getCredits(): Promise<UserCredits | null> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Return default credits for unauthenticated users (allows trying the feature)
    return { credits: 1, totalUsed: 0 };
  }

  const { data, error } = await (supabase as any)
    .from('user_credits')
    .select('credits, total_used')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // If no record exists, user hasn't generated checkpoints yet
    if (error.code === 'PGRST116') {
      // Initialize credits for user
      await initializeCredits();
      return { credits: 1, totalUsed: 0 };
    }
    console.error('[Credits] Error fetching credits:', error);
    // Return default on error to allow using the feature
    return { credits: 1, totalUsed: 0 };
  }

  return {
    credits: data?.credits ?? 1,
    totalUsed: data?.total_used ?? 0,
  };
}

/**
 * Check if user has available credits
 */
export async function hasCredits(): Promise<boolean> {
  const credits = await getCredits();
  return credits ? credits.credits > 0 : true; // Default to true if error
}

/**
 * Use one credit for checkpoint generation
 * Returns true if successful, false if no credits available
 */
export async function useCredit(): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('[Credits] No authenticated user - allowing free use');
    return true; // Allow unauthenticated users to use for demo
  }

  // Try to call the atomic use_credit function
  try {
    const { data, error } = await (supabase as any)
      .rpc('use_credit', { p_user_id: user.id });

    if (error) {
      // If function doesn't exist yet (migration not run), allow usage
      if (error.code === '42883' || error.message?.includes('function')) {
        console.warn('[Credits] use_credit function not found - migration may not be run');
        return true;
      }
      console.error('[Credits] Error using credit:', error);
      return true; // Allow on error for better UX
    }

    return data === true;
  } catch (e) {
    console.error('[Credits] Exception using credit:', e);
    return true; // Allow on error
  }
}

/**
 * Initialize credits for a new user
 */
export async function initializeCredits(): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  try {
    const { error } = await (supabase as any)
      .from('user_credits')
      .upsert({
        user_id: user.id,
        credits: 1,
        total_used: 0,
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: true,
      });

    if (error) {
      // Table might not exist yet (migration not run)
      if (error.code === '42P01') {
        console.warn('[Credits] user_credits table not found - migration may not be run');
        return true;
      }
      console.error('[Credits] Error initializing credits:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[Credits] Exception initializing credits:', e);
    return true; // Return true to not block user
  }
}

/**
 * Add credits to user account (for future payment integration)
 */
export async function addCredits(amount: number): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  try {
    // Get current credits and increment
    const { data: current } = await (supabase as any)
      .from('user_credits')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    const newCredits = (current?.credits ?? 0) + amount;

    const { error } = await (supabase as any)
      .from('user_credits')
      .upsert({
        user_id: user.id,
        credits: newCredits,
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('[Credits] Error adding credits:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[Credits] Exception adding credits:', e);
    return false;
  }
}
