/**
 * Note Editor Component
 * 
 * Inline editor for creating and editing video notes.
 * 
 * FEATURES:
 * - Auto-focus on mount
 * - Debounced autosave (500ms)
 * - Optimistic UI updates
 * - Visual save indicator
 * - XSS sanitization
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { sanitizeNoteContent, validateNoteBody } from '@/utils/security/sanitize';
import { formatTimestamp } from '@/utils/format/time';
import styles from './NoteEditor.module.css';

export interface NoteEditorProps {
  noteId?: string;
  initialBody?: string;
  initialTitle?: string;
  timestamp: number;
  onSave: (data: { title?: string; body: string }) => Promise<void>;
  onClose?: () => void;
  onComplete?: () => void; // Called when user presses Enter to finish note
  autoFocus?: boolean;
}

export function NoteEditor({
  noteId,
  initialBody = '',
  initialTitle = '',
  timestamp,
  onSave,
  onClose,
  onComplete,
  autoFocus = true,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && bodyRef.current) {
      bodyRef.current.focus();
    }
  }, [autoFocus]);


  // Handle Enter key to complete note
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        
        const hasContent = body.trim().length > 0 || (title && title.trim().length > 0);

        // If empty, just resume video (treat as cancel/complete without save)
        if (!hasContent) {
          onComplete?.();
          return;
        }
        
        const sanitizedBody = sanitizeNoteContent(body);
        const sanitizedTitle = title ? sanitizeNoteContent(title) : undefined;
        
        console.log('[NoteEditor] Saving note via Enter shortcut');
        onSave({
          title: sanitizedTitle,
          body: sanitizedBody,
        }).then(() => {
          console.log('[NoteEditor] Save successful, completing');
          onComplete?.();
        }).catch(err => {
          console.error('Failed to save note:', err);
          setError(err instanceof Error ? err.message : 'Failed to save');
        });
      }
    },
    [body, title, onSave, onComplete] // Removed onClose from deps as it's not used
  );

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <div className={styles.timestamp}>
          {formatTimestamp(timestamp)}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close editor"
          >
            ×
          </button>
        )}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Note title (optional)"
        className={styles.titleInput}
        maxLength={200}
      />

      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write your note here... (Press Enter to save and close)"
        className={styles.bodyTextarea}
        rows={6}
      />

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  );
}
