/**
 * Migration Script: Fix Existing Notes Sync Status
 * 
 * This script migrates existing notes from boolean _pendingSync values
 * to numeric values (1 for pending, 0 for synced).
 * 
 * Run this once to fix existing notes in IndexedDB.
 */

import { openDB } from 'idb';

const DB_NAME = 'pauser-notes';
const DB_VERSION = 1;
const NOTES_STORE = 'notes';

export async function migrateNoteSyncStatus(): Promise<{ migrated: number; total: number }> {
  console.log('[Migration] Starting note sync status migration...');
  
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(NOTES_STORE, 'readwrite');
  const store = tx.objectStore(NOTES_STORE);
  
  const allNotes = await store.getAll();
  console.log(`[Migration] Found ${allNotes.length} notes to check`);
  
  let migratedCount = 0;
  
  for (const note of allNotes) {
    let needsUpdate = false;
    const updates: any = { ...note };
    
    // Convert boolean _pendingSync to numeric
    if (note._pendingSync === true) {
      updates._pendingSync = 1;
      needsUpdate = true;
    } else if (note._pendingSync === false) {
      updates._pendingSync = 0;
      needsUpdate = true;
    } else if (note._pendingSync === undefined) {
      // Assume undefined means it needs to be synced
      updates._pendingSync = 1;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await store.put(updates);
      migratedCount++;
      console.log(`[Migration] Migrated note ${note.id}: _pendingSync = ${updates._pendingSync}`);
    }
  }
  
  await tx.done;
  
  console.log(`[Migration] Migration complete. Migrated ${migratedCount} of ${allNotes.length} notes`);
  
  return {
    migrated: migratedCount,
    total: allNotes.length,
  };
}

// Auto-run migration on import (only in browser)
if (typeof window !== 'undefined') {
  migrateNoteSyncStatus().catch(err => {
    console.error('[Migration] Failed to migrate notes:', err);
  });
}
