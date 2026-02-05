/**
 * API Authentication Utility
 * 
 * Provides authentication helpers for Next.js API routes.
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: NextResponse | null;
}

/**
 * Authenticate an API request and return the user or an error response.
 */
export async function authenticateRequest(): Promise<AuthResult> {
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    };
  }
  
  return {
    user: {
      id: user.id,
      email: user.email ?? null
    },
    error: null
  };
}

/**
 * Helper to check if the authenticated user can access a resource.
 * Returns true if userId matches the authenticated user or if no userId restriction.
 */
export function canAccessUserResource(
  authenticatedUserId: string,
  resourceUserId: string
): boolean {
  return authenticatedUserId === resourceUserId;
}
