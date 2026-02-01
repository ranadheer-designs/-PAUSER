/**
 * Organized Notes Cache
 * 
 * Caches AI-organized notes results in localStorage with hash-based invalidation.
 * When raw notes change, the cache is automatically invalidated.
 */

import type { OrganizedNotesResult } from '@pauser/common';

const CACHE_PREFIX = 'pauser_organized_notes_';
const CACHE_VERSION = 1;

interface CacheEntry {
  version: number;
  result: OrganizedNotesResult;
  expiresAt: number;
}

/**
 * Generate a hash from notes content to detect changes.
 */
export function generateNotesHash(notes: Array<{ id: string; body: string; startTimeSeconds: number }>): string {
  const content = notes
    .map(n => `${n.id}:${n.startTimeSeconds}:${n.body}`)
    .sort()
    .join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `v${CACHE_VERSION}_${hash.toString(36)}`;
}

/**
 * Get cache key for a content ID.
 */
function getCacheKey(contentId: string): string {
  return `${CACHE_PREFIX}${contentId}`;
}

/**
 * Get cached organized notes for a content ID.
 * Returns null if cache is invalid or expired.
 */
export function getCachedOrganizedNotes(
  contentId: string, 
  currentNotesHash: string
): OrganizedNotesResult | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getCacheKey(contentId);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    
    // Check version
    if (entry.version !== CACHE_VERSION) {
      console.log('[Cache] Version mismatch, invalidating');
      localStorage.removeItem(key);
      return null;
    }
    
    // Check expiration (24 hours)
    if (Date.now() > entry.expiresAt) {
      console.log('[Cache] Expired, invalidating');
      localStorage.removeItem(key);
      return null;
    }
    
    // Check hash (notes changed?)
    if (entry.result.notesHash !== currentNotesHash) {
      console.log('[Cache] Notes changed, invalidating');
      localStorage.removeItem(key);
      return null;
    }
    
    console.log('[Cache] Hit for organized notes');
    return entry.result;
    
  } catch (error) {
    console.warn('[Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Cache organized notes result.
 */
export function setCachedOrganizedNotes(
  contentId: string, 
  result: OrganizedNotesResult
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getCacheKey(contentId);
    const entry: CacheEntry = {
      version: CACHE_VERSION,
      result,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };
    
    localStorage.setItem(key, JSON.stringify(entry));
    console.log('[Cache] Saved organized notes');
    
  } catch (error) {
    console.warn('[Cache] Error saving cache:', error);
  }
}

/**
 * Clear cache for a specific content ID.
 */
export function clearOrganizedNotesCache(contentId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getCacheKey(contentId);
    localStorage.removeItem(key);
    console.log('[Cache] Cleared organized notes cache');
  } catch (error) {
    console.warn('[Cache] Error clearing cache:', error);
  }
}

/**
 * Clear all organized notes caches.
 */
export function clearAllOrganizedNotesCaches(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[Cache] Cleared ${keysToRemove.length} organized notes caches`);
  } catch (error) {
    console.warn('[Cache] Error clearing all caches:', error);
  }
}
