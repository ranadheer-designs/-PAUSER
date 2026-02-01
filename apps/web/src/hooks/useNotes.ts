/**
 * useNotes Hook
 * 
 * Manages notes state with offline-first architecture.
 * 
 * FEATURES:
 * - Local-first writes (IndexedDB)
 * - Background sync to Supabase
 * - Optimistic UI updates
 * - Automatic retry on failure
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getNotesByContent, saveNoteLocal, deleteNoteLocal, generateLocalId } from '@/utils/db/notesDB';
import { syncNotes, startAutoSync, stopAutoSync } from '@/utils/sync/notesSyncManager';
import type { Note } from '@pauser/common';

export interface UseNotesOptions {
  contentId: string;
  userId: string;
  autoSync?: boolean;
}

export interface UseNotesReturn {
  notes: Note[];
  loading: boolean;
  error: string | null;
  createNote: (data: { startTimeSeconds: number; body: string; title?: string }) => Promise<Note>;
  updateNote: (noteId: string, data: { body?: string; title?: string; endTimeSeconds?: number }) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotes({ contentId, userId, autoSync = true }: UseNotesOptions): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load notes from IndexedDB
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const localNotes = await getNotesByContent(contentId);
      setNotes(localNotes);
      setError(null);
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  // Initial load
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Start auto-sync
  // Start auto-sync
  useEffect(() => {
    if (!autoSync) return;

    startAutoSync(userId);
    return () => stopAutoSync();
  }, [autoSync, userId]);

  // Create a new note
  const createNote = useCallback(
    async (data: { startTimeSeconds: number; body: string; title?: string }): Promise<Note> => {
      const newNote: Note = {
        id: generateLocalId(),
        userId,
        contentId,
        startTimeSeconds: data.startTimeSeconds,
        title: data.title,
        body: data.body,
        isDraft: true,
        localId: generateLocalId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save locally first (instant)
      await saveNoteLocal(newNote);

      // Update UI optimistically
      setNotes(prev => [...prev, newNote].sort((a, b) => a.startTimeSeconds - b.startTimeSeconds));

      // Trigger background sync
      syncNotes(userId).catch(err => {
        console.error('Background sync failed:', err);
      });

      return newNote;
    },
    [userId, contentId]
  );


  // Update an existing note
  const updateNote = useCallback(
    async (
      noteId: string,
      data: { body?: string; title?: string; endTimeSeconds?: number }
    ): Promise<void> => {
      // Find existing note in state
      let existingNote = notes.find(n => n.id === noteId);
      
      // If not in state, try loading from IndexedDB
      if (!existingNote) {
        const { getNoteById } = await import('@/utils/db/notesDB');
        const noteFromDb = await getNoteById(noteId);
        existingNote = noteFromDb ?? undefined;
      }
      
      if (!existingNote) {
        console.error('Note not found:', noteId);
        throw new Error('Note not found');
      }

      const updatedNote: Note = {
        ...existingNote,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      // Save locally first
      await saveNoteLocal(updatedNote);

      // Update UI optimistically
      setNotes(prev => {
        const exists = prev.some(n => n.id === noteId);
        if (exists) {
          return prev.map(n => (n.id === noteId ? updatedNote : n));
        } else {
          // Add to state if not present
          return [...prev, updatedNote].sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
        }
      });

      // Trigger background sync
      syncNotes(userId).catch(err => {
        console.error('Background sync failed:', err);
      });
    },
    [notes, userId]
  );


  // Delete a note
  const deleteNote = useCallback(
    async (noteId: string): Promise<void> => {
      // Delete locally first
      await deleteNoteLocal(noteId);

      // Update UI optimistically
      setNotes(prev => prev.filter(n => n.id !== noteId));

      // Trigger background sync
      syncNotes(userId).catch(err => {
        console.error('Background sync failed:', err);
      });
    },
    [userId]
  );

  // Refresh notes from local storage
  const refresh = useCallback(async () => {
    await loadNotes();
  }, [loadNotes]);

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refresh,
  };
}
