/**
 * IndexedDB Wrapper for Notes
 * 
 * Provides offline-first storage for video notes with sync queue management.
 * 
 * ARCHITECTURE:
 * - Notes are stored locally first (instant writes)
 * - Pending changes are tracked in sync queue
 * - Background sync pushes to Supabase when online
 * - Conflicts resolved via last-write-wins strategy
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Note } from '@pauser/common';

const DB_NAME = 'pauser-notes';
const DB_VERSION = 1;
const NOTES_STORE = 'notes';

interface NotesDB extends DBSchema {
  notes: {
    key: string; // note.id
    value: Note & { _pendingSync?: number; _deleted?: boolean };
    indexes: {
      'by-content': string; // content_id
      'by-timestamp': [string, number]; // [content_id, start_time_seconds]
      'pending-sync': number; // 1 if pending, 0 if synced
    };
  };
}

let dbInstance: IDBPDatabase<NotesDB> | null = null;

/**
 * Initialize and get database instance.
 */
async function getDB(): Promise<IDBPDatabase<NotesDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<NotesDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create notes store
      const notesStore = db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
      
      // Indexes for efficient queries
      notesStore.createIndex('by-content', 'contentId');
      notesStore.createIndex('by-timestamp', ['contentId', 'startTimeSeconds']);
      notesStore.createIndex('pending-sync', '_pendingSync');
    },
  });
  
  return dbInstance;
}

/**
 * Get all notes for a specific video.
 */
export async function getNotesByContent(contentId: string): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAllFromIndex(NOTES_STORE, 'by-content', contentId);
  
  // Filter out deleted notes
  return notes
    .filter(note => !note._deleted)
    .map(note => {
      const { _pendingSync, _deleted, ...cleanNote } = note;
      return cleanNote as Note;
    })
    .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
}

/**
 * Get a single note by ID.
 */
export async function getNoteById(id: string): Promise<Note | null> {
  const db = await getDB();
  const note = await db.get(NOTES_STORE, id);
  
  if (!note || note._deleted) return null;
  
  const { _pendingSync, _deleted, ...cleanNote } = note;
  return cleanNote as Note;
}

/**
 * Save a note locally (creates or updates).
 * Marks as pending sync.
 */
export async function saveNoteLocal(note: Note): Promise<void> {
  const db = await getDB();
  await db.put(NOTES_STORE, {
    ...note,
    _pendingSync: 1, // Use number 1 instead of boolean true for IndexedDB index
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a note locally.
 * Marks as deleted and pending sync.
 */
export async function deleteNoteLocal(id: string): Promise<void> {
  const db = await getDB();
  const note = await db.get(NOTES_STORE, id);
  
  if (note) {
    await db.put(NOTES_STORE, {
      ...note,
      _deleted: true,
      _pendingSync: 1, // Use number 1 instead of boolean true
    });
  }
}

/**
 * Get all notes pending sync.
 */
export async function getPendingSyncNotes(): Promise<(Note & { _deleted?: boolean })[]> {
  const db = await getDB();
  // Query for _pendingSync === 1 (number, not boolean true)
  const notes = await db.getAllFromIndex(NOTES_STORE, 'pending-sync', 1);
  
  console.log('[getPendingSyncNotes] Found notes with _pendingSync === 1:', notes.length);
  
  return notes.map(note => {
    const { _pendingSync, ...noteData } = note;
    return noteData as Note & { _deleted?: boolean };
  });
}

/**
 * Mark a note as synced.
 */
export async function markNoteSynced(id: string, syncedAt: string): Promise<void> {
  const db = await getDB();
  const note = await db.get(NOTES_STORE, id);
  
  if (note) {
    if (note._deleted) {
      // Remove deleted notes after sync
      await db.delete(NOTES_STORE, id);
    } else {
      await db.put(NOTES_STORE, {
        ...note,
        _pendingSync: 0, // Use number 0 for synced (not boolean false)
        syncedAt,
      });
    }
  }
}

/**
 * Bulk update notes from server (for initial sync or conflict resolution).
 */
export async function bulkUpdateNotes(notes: Note[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(NOTES_STORE, 'readwrite');
  
  await Promise.all([
    ...notes.map(note => tx.store.put({
      ...note,
      _pendingSync: 0, // Use number 0 for synced
    })),
    tx.done,
  ]);
}

/**
 * Clear all local notes (use with caution).
 */
export async function clearAllNotes(): Promise<void> {
  const db = await getDB();
  await db.clear(NOTES_STORE);
}

/**
 * Generate a client-side unique ID for offline notes.
 */
export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
