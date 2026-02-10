'use server';

import { AIService } from '@pauser/common';
import type { Note, OrganizedNotesAIResult } from '@pauser/common';

/**
 * Organizes notes using AI on the server side to protect API keys.
 */
export async function organizeNotesAction(
  notes: Array<{ id: string; body: string; startTimeSeconds: number }>,
  model?: string
): Promise<{ success: boolean; data?: OrganizedNotesAIResult; error?: string }> {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY; // No NEXT_PUBLIC_ check here, purely server-side

    if (!openRouterKey && !geminiKey) {
      console.error('[organizeNotesAction] No API keys configured');
      return { success: false, error: 'AI service not configured on server' };
    }

    const aiService = new AIService({
      enabled: true,
      model: model || 'meta-llama/llama-3.3-70b-instruct:free',
      apiKey: openRouterKey || geminiKey || '', // AIService handles empty string if geminiKey is set via other property
      geminiApiKey: geminiKey, // For hybrid provider support
    });

    console.log(`[organizeNotesAction] Organizing ${notes.length} notes...`);

    const result = await aiService.organizeNotes({
      notes: notes.map(n => ({
        id: n.id,
        body: n.body,
        startTimeSeconds: n.startTimeSeconds,
      })),
    });

    if (!result) {
      return { success: false, error: 'AI returned no results' };
    }

    return { success: true, data: result };

  } catch (error) {
    console.error('[organizeNotesAction] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown server error' 
    };
  }
}
