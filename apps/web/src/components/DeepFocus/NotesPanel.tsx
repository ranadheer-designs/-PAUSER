/**
 * Notes Panel Component
 * 
 * Sidebar panel displaying notes for the current video.
 * 
 * FEATURES:
 * - List notes ordered by timestamp
 * - "Take Note" button (pauses video, captures timestamp)
 * - Click note → seek to timestamp + open editor
 * - Visual sync status indicators
 * - Offline-first with background sync
 * - AI-Organized view toggle
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { NoteEditor } from './NoteEditor';
import { OrganizedNotesView } from './OrganizedNotesView';
import { formatTimestamp, formatRelativeTime } from '@/utils/format/time';
import { getSyncState, onSyncStateChange } from '@/utils/sync/notesSyncManager';
import { useOrganizedNotes } from '@/hooks/useOrganizedNotes';
import type { Note } from '@pauser/common';
import styles from './NotesPanel.module.css';

export interface NotesPanelProps {
  contentId: string;
  notes: Note[];
  currentTime: number;
  onTakeNote: () => Promise<Note | null>;
  onNoteClick: (note: Note) => void;
  onNoteSave: (noteId: string | undefined, data: { title?: string; body: string }) => Promise<void>;
  onNoteComplete?: () => void; // Called when user finishes a note (presses Enter)
  onNoteDelete?: (noteId: string) => Promise<void>;
  onEditingChange?: (isEditing: boolean) => void; // Called when editing state changes
  triggerTakeNoteRef?: React.MutableRefObject<(() => void) | null>; // Ref to programmatically trigger note-taking
  checkpointsEnabled?: boolean;
  onToggleCheckpoints?: () => void;
  isCheckpointsPending?: boolean;
}

type ViewMode = 'raw' | 'organized';

export function NotesPanel({
  contentId,
  notes,
  currentTime,
  onTakeNote,
  onNoteClick,
  onNoteSave,
  onNoteComplete,
  onNoteDelete,
  onEditingChange,
  triggerTakeNoteRef,
  checkpointsEnabled = false,
  onToggleCheckpoints,
  isCheckpointsPending = false,
}: NotesPanelProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState(getSyncState());
  const [viewMode, setViewMode] = useState<ViewMode>('raw');

  // AI-organized notes hook
  const {
    organizedSections,
    isOrganizing,
    error: organizeError,
    organize,
    canOrganize,
    hasCachedResult,
  } = useOrganizedNotes({ contentId, notes });

  // Subscribe to sync state changes
  useEffect(() => {
    const unsubscribe = onSyncStateChange(setSyncStatus);
    return unsubscribe;
  }, []);

  // Notify parent when editing state changes
  useEffect(() => {
    onEditingChange?.(editingNoteId !== null);
  }, [editingNoteId, onEditingChange]);

  // Switch to raw view when editing
  useEffect(() => {
    if (editingNoteId) {
      setViewMode('raw');
    }
  }, [editingNoteId]);

  const handleNoteClick = useCallback(
    (note: Note) => {
      setEditingNoteId(note.id);
      onNoteClick(note);
    },
    [onNoteClick]
  );

  const handleNoteSave = useCallback(
    async (data: { title?: string; body: string }) => {
      // If editing a new note, pass undefined to create it
      // Otherwise pass the actual note ID to update it
      const noteId = editingNoteId === 'new' ? undefined : editingNoteId ?? undefined;
      await onNoteSave(noteId, data);
    },
    [editingNoteId, onNoteSave]
  );

  const handleCloseEditor = useCallback(() => {
    setEditingNoteId(null);
  }, []);

  const handleNoteComplete = useCallback(() => {
    setEditingNoteId(null);
    onNoteComplete?.();
  }, [onNoteComplete]);

  const handleTakeNote = useCallback(async () => {
    const newNote = await onTakeNote();
    // Set editing to 'new' to show fresh editor
    // Note will be created on first save
    setEditingNoteId(newNote?.id || 'new');
  }, [onTakeNote]);

  // Handle organized view timestamp click
  const handleOrganizedTimestampClick = useCallback(
    (timestamp: number, noteId: string) => {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        onNoteClick(note);
      }
    },
    [notes, onNoteClick]
  );

  // Handle view mode toggle
  const handleViewToggle = useCallback(async (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'organized' && !organizedSections && canOrganize) {
      await organize();
    }
  }, [organize, organizedSections, canOrganize]);

  // Expose handleTakeNote to parent via ref
  useEffect(() => {
    if (triggerTakeNoteRef) {
      triggerTakeNoteRef.current = handleTakeNote;
    }
    return () => {
      if (triggerTakeNoteRef) {
        triggerTakeNoteRef.current = null;
      }
    };
  }, [handleTakeNote, triggerTakeNoteRef]);

  const editingNote = editingNoteId && editingNoteId !== 'new'
    ? notes.find(n => n.id === editingNoteId)
    : null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Notes</h2>
          {onToggleCheckpoints && (
            <button 
              className={`${styles.checkpointToggle} ${checkpointsEnabled ? styles.active : ''}`}
              onClick={onToggleCheckpoints}
              disabled={isCheckpointsPending}
              title={checkpointsEnabled ? 'Disable Cognitive Checkpoints' : 'Enable Cognitive Checkpoints'}
            >
              <span className={styles.toggleIcon} />
              {isCheckpointsPending ? '...' : (checkpointsEnabled ? 'Brain Active' : 'Enable Brain')}
            </button>
          )}
        </div>
        <div className={styles.syncStatus}>
          {syncStatus.isSyncing && (
            <span className={styles.syncing}>Syncing...</span>
          )}
          {syncStatus.error && (
            <span className={styles.syncError} title={syncStatus.error}>
              Offline
            </span>
          )}
          {!syncStatus.isSyncing && !syncStatus.error && syncStatus.lastSyncAt && (
            <span className={styles.synced}>Synced</span>
          )}
        </div>
      </div>

      <button onClick={handleTakeNote} className={styles.takeNoteButton}>
        + Take Note
        <span className={styles.shortcutKey}>↵</span>
      </button>

      {/* View Mode Toggle - only show if we have 2+ notes */}
      {canOrganize && (
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleButton} ${viewMode === 'raw' ? styles.toggleActive : ''}`}
            onClick={() => handleViewToggle('raw')}
          >
            Raw Notes
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'organized' ? styles.toggleActive : ''}`}
            onClick={() => handleViewToggle('organized')}
            disabled={isOrganizing}
          >
            {isOrganizing ? 'Organizing...' : 'Organized'}
            {hasCachedResult && <span className={styles.cachedDot} title="Cached" />}
          </button>
        </div>
      )}

      {/* Active Editor */}
      {editingNoteId && (
        <div className={styles.editorContainer}>
          <NoteEditor
            noteId={editingNote?.id}
            initialBody={editingNote?.body}
            initialTitle={editingNote?.title}
            timestamp={editingNote?.startTimeSeconds ?? currentTime}
            onSave={handleNoteSave}
            onClose={handleCloseEditor}
            onComplete={handleNoteComplete}
            autoFocus={true}
          />
        </div>
      )}

      {/* Organized View */}
      {viewMode === 'organized' && organizedSections && (
        <OrganizedNotesView
          sections={organizedSections}
          onTimestampClick={handleOrganizedTimestampClick}
        />
      )}

      {/* Organize Error */}
      {viewMode === 'organized' && organizeError && (
        <div className={styles.organizeError}>
          <p>Could not organize notes: {organizeError}</p>
          <button onClick={() => setViewMode('raw')} className={styles.fallbackButton}>
            View Raw Notes
          </button>
        </div>
      )}

      {/* Raw Notes List */}
      {viewMode === 'raw' && (
        <div className={styles.notesList}>
          {notes.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No notes yet.</p>
              <p className={styles.emptyHint}>
                Click "Take Note" to capture your thoughts at any moment.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`${styles.noteItem} ${
                  editingNoteId === note.id ? styles.active : ''
                }`}
                onClick={() => handleNoteClick(note)}
              >
                <div className={styles.noteHeader}>
                  <span className={styles.noteTimestamp}>
                    {formatTimestamp(note.startTimeSeconds)}
                  </span>
                  <span className={styles.noteTime}>
                    {formatRelativeTime(note.updatedAt)}
                  </span>
                </div>
                {note.title && (
                  <div className={styles.noteTitle}>{note.title}</div>
                )}
                <div className={styles.noteBody}>
                  {note.body.length > 100
                    ? `${note.body.substring(0, 100)}...`
                    : note.body}
                </div>
                {note.isDraft && (
                  <span className={styles.draftBadge}>Draft</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

