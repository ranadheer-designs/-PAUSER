/**
 * Notes Sync Manager
 * 
 * Handles bidirectional sync between IndexedDB and Supabase.
 * 
 * SYNC STRATEGY:
 * 1. Local-first: All writes go to IndexedDB immediately
 * 2. Background sync: Push pending changes to Supabase when online
 * 3. Conflict resolution: Last-write-wins (based on updated_at timestamp)
 * 4. Retry logic: Exponential backoff for failed syncs
 * 
 * ARCHITECTURE DECISION:
 * We use a simple last-write-wins strategy for conflicts because:
 * - Notes are personal (single user, no collaboration)
 * - Conflicts are rare (same note edited on different devices)
 * - Simplicity > complexity for MVP
 */

import {
  getPendingSyncNotes,
  markNoteSynced,
  bulkUpdateNotes,
  saveNoteLocal,
} from '@/utils/db/notesDB';
import {
  upsertNote,
  deleteNote as deleteNoteSupabase,
  getNotesByContentId,
} from '@/actions/notes';
import type { Note } from '@pauser/common';

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  error: string | null;
}

let syncState: SyncState = {
  isSyncing: false,
  lastSyncAt: null,
  error: null,
};

let syncListeners: Array<(state: SyncState) => void> = [];

/**
 * Subscribe to sync state changes.
 */
export function onSyncStateChange(listener: (state: SyncState) => void): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

/**
 * Get current sync state.
 */
export function getSyncState(): SyncState {
  return { ...syncState };
}

/**
 * Update sync state and notify listeners.
 */
function updateSyncState(updates: Partial<SyncState>) {
  syncState = { ...syncState, ...updates };
  syncListeners.forEach(listener => listener(syncState));
}

/**
 * Check if browser is online.
 */
function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Sync pending notes to Supabase.
 * 
 * RETRY LOGIC:
 * - Exponential backoff: 1s, 2s, 4s, 8s, 16s
 * - Max retries: 5
 * - Gives up after max retries (user can manually retry)
 */
export async function syncNotes(userId: string, maxRetries = 5): Promise<void> {
  console.log('[syncNotes] Starting sync for userId:', userId);
  
  if (!isOnline()) {
    console.log('[syncNotes] Browser is offline, skipping sync');
    updateSyncState({ error: 'Offline' });
    return;
  }
  
  if (syncState.isSyncing) {
    console.log('[syncNotes] Already syncing, skipping');
    return; // Already syncing
  }
  
  updateSyncState({ isSyncing: true, error: null });
  
  try {
    const pendingNotes = await getPendingSyncNotes();
    console.log('[syncNotes] Found pending notes:', pendingNotes.length);
    console.log('[syncNotes] Pending notes:', pendingNotes);
    
    if (pendingNotes.length === 0) {
      console.log('[syncNotes] No pending notes, sync complete');
      updateSyncState({
        isSyncing: false,
        lastSyncAt: new Date(),
      });
      return;
    }
    
    // Push pending changes to Supabase
    for (const note of pendingNotes) {
      console.log('[syncNotes] Syncing note:', note.id);
      let retries = 0;
      let success = false;
      
      while (retries < maxRetries && !success) {
        try {
          if (note._deleted) {
            console.log('[syncNotes] Deleting note from Supabase:', note.id);
            // Delete from Supabase
            await deleteNoteSupabase(note.id);
          } else {
            console.log('[syncNotes] Upserting note to Supabase:', note.id);
            // Upsert to Supabase
            await upsertNote(userId, note);
          }
          
          // Mark as synced locally
          await markNoteSynced(note.id, new Date().toISOString());
          console.log('[syncNotes] Successfully synced note:', note.id);
          success = true;
        } catch (error) {
          console.error('[syncNotes] Error syncing note:', note.id, error);
          retries++;
          if (retries < maxRetries) {
            console.log('[syncNotes] Retrying in', Math.pow(2, retries), 'seconds');
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
          } else {
            console.error('[syncNotes] Failed to sync note after max retries:', error);
            throw error;
          }
        }
      }
    }
    
    console.log('[syncNotes] All notes synced successfully');
    updateSyncState({
      isSyncing: false,
      lastSyncAt: new Date(),
      error: null,
    });
  } catch (error) {
    console.error('[syncNotes] Sync failed with error:', error);
    updateSyncState({
      isSyncing: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    });
    throw error;
  }
}

/**
 * Pull notes from Supabase for a specific video.
 * Merges with local notes using last-write-wins.
 */
export async function pullNotesForContent(contentId: string): Promise<Note[]> {
  if (!isOnline()) {
    throw new Error('Cannot pull notes while offline');
  }
  
  try {
    const remoteNotes = await getNotesByContentId(contentId);
    
    // Update local database with remote notes
    // Local pending changes will be preserved (not overwritten)
    await bulkUpdateNotes(remoteNotes);
    
    return remoteNotes;
  } catch (error) {
    console.error('Failed to pull notes:', error);
    throw error;
  }
}

/**
 * Start automatic sync on interval (when online).
 */
let syncInterval: NodeJS.Timeout | null = null;

export function startAutoSync(userId: string, intervalMs = 30000): void {
  if (syncInterval) return; // Already started
  
  syncInterval = setInterval(() => {
    if (isOnline()) {
      syncNotes(userId).catch(err => {
        console.error('Auto-sync failed:', err);
      });
    }
  }, intervalMs);
  
  // Also sync on online event
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      syncNotes(userId).catch(err => {
        console.error('Sync on online event failed:', err);
      });
    });
  }
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
