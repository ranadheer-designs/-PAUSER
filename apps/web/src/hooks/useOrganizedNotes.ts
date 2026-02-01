/**
 * useOrganizedNotes Hook
 * 
 * Manages AI-organized notes with caching and lazy loading.
 * 
 * FEATURES:
 * - Calls AI organization on-demand (not automatic)
 * - Caches results locally with hash-based invalidation
 * - Provides loading/error states
 * - Falls back gracefully if AI fails or violates rules
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { AIService } from '@pauser/common';
import type { Note, OrganizedNotesResult, OrganizedNotesSection } from '@pauser/common';
import { 
  generateNotesHash, 
  getCachedOrganizedNotes, 
  setCachedOrganizedNotes,
  clearOrganizedNotesCache 
} from '@/utils/organizedNotesCache';

export interface UseOrganizedNotesOptions {
  contentId: string;
  notes: Note[];
}

export interface UseOrganizedNotesReturn {
  /** Organized sections (null if not yet organized or failed) */
  organizedSections: OrganizedNotesSection[] | null;
  /** Whether organization is in progress */
  isOrganizing: boolean;
  /** Error message if organization failed */
  error: string | null;
  /** Trigger AI organization */
  organize: () => Promise<void>;
  /** Clear cached organization */
  clearCache: () => void;
  /** Whether notes are eligible for organization (2+ notes required) */
  canOrganize: boolean;
  /** Whether a cached result exists */
  hasCachedResult: boolean;
}

export function useOrganizedNotes({ 
  contentId, 
  notes 
}: UseOrganizedNotesOptions): UseOrganizedNotesReturn {
  const [organizedResult, setOrganizedResult] = useState<OrganizedNotesResult | null>(null);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate hash for current notes
  const notesHash = useMemo(() => {
    return generateNotesHash(notes.map(n => ({
      id: n.id,
      body: n.body,
      startTimeSeconds: n.startTimeSeconds,
    })));
  }, [notes]);

  // Check if we can organize (need 2+ notes)
  const canOrganize = notes.length >= 2;

  // Check for cached result on mount or when notes change
  const cachedResult = useMemo(() => {
    if (!canOrganize) return null;
    return getCachedOrganizedNotes(contentId, notesHash);
  }, [contentId, notesHash, canOrganize]);

  // Use cached result if available
  const hasCachedResult = cachedResult !== null;
  const organizedSections = organizedResult?.sections ?? cachedResult?.sections ?? null;

  // Trigger AI organization
  const organize = useCallback(async () => {
    if (!canOrganize) {
      setError('Need at least 2 notes to organize');
      return;
    }

    // Check cache first
    const cached = getCachedOrganizedNotes(contentId, notesHash);
    if (cached) {
      setOrganizedResult(cached);
      setError(null);
      return;
    }

    setIsOrganizing(true);
    setError(null);

    try {
      // Get API keys from environment
      const openRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
      const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
      
      if (!openRouterKey && !geminiKey) {
        throw new Error('No AI API key configured');
      }

      console.log('[useOrganizedNotes] Starting organization with', notes.length, 'notes');

      const aiService = new AIService({
        enabled: true,
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        apiKey: openRouterKey || geminiKey,
      });

      const aiResult = await aiService.organizeNotes({
        notes: notes.map(n => ({
          id: n.id,
          body: n.body,
          startTimeSeconds: n.startTimeSeconds,
        })),
      });

      if (!aiResult) {
        throw new Error('AI returned no results - try again later');
      }

      if (aiResult.sections.length === 0) {
        throw new Error('AI could not categorize notes into sections');
      }

      // Build full result with metadata
      const result: OrganizedNotesResult = {
        sections: aiResult.sections,
        generatedAt: new Date().toISOString(),
        notesHash,
      };

      // Cache the result
      setCachedOrganizedNotes(contentId, result);
      setOrganizedResult(result);
      console.log('[useOrganizedNotes] Successfully organized into', result.sections.length, 'sections');

    } catch (err) {
      console.error('[useOrganizedNotes] Organization failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Organization failed';
      setError(errorMsg.includes('fetch') ? 'Network error - check connection' : errorMsg);
    } finally {
      setIsOrganizing(false);
    }
  }, [contentId, notes, notesHash, canOrganize]);

  // Clear cache
  const clearCache = useCallback(() => {
    clearOrganizedNotesCache(contentId);
    setOrganizedResult(null);
    setError(null);
  }, [contentId]);

  return {
    organizedSections,
    isOrganizing,
    error,
    organize,
    clearCache,
    canOrganize,
    hasCachedResult,
  };
}
