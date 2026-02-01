'use client';

/**
 * SnapshotCheckpoint Component
 * 
 * The core UI for "Understanding Snapshots".
 * 
 * Design Philosophy:
 * - Minimalist: Prompt + Editor. No clutter.
 * - Calm: Whitespace, readable typography.
 * - Frictionless: Auto-focus, autosave, easy continue.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './SnapshotCheckpoint.module.css';

interface SnapshotContent {
  type: 'snapshot';
  prompt: string;
  context: string;
}

interface SnapshotCheckpointProps {
  content: SnapshotContent;
  onComplete: () => void;
  onSaveArtifact: (data: {
    type: 'snapshot';
    userText: string;
    conceptName: string;
  }) => Promise<void>;
}

export function SnapshotCheckpoint({
  content,
  onComplete,
  onSaveArtifact,
}: SnapshotCheckpointProps) {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedText, setLastSavedText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-focus
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Autosave logic (debounce)
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (text.trim() && text !== lastSavedText) {
        setIsSaving(true);
        try {
          await onSaveArtifact({
            type: 'snapshot',
            userText: text,
            conceptName: 'Understanding Snapshot', // Generic concept name for now
          });
          setLastSavedText(text);
        } catch (err) {
          console.error('Autosave failed', err);
        } finally {
          setIsSaving(false);
        }
      }
    }, 2000); // 2s debounce

    return () => clearTimeout(timeoutId);
  }, [text, lastSavedText, onSaveArtifact]);

  // Handle manual save & continue
  const handleContinue = async () => {
    if (!text.trim()) {
      onComplete(); // Skip if empty
      return;
    }

    setIsSaving(true);
    try {
      // Force final save
      await onSaveArtifact({
        type: 'snapshot',
        userText: text,
        conceptName: 'Understanding Snapshot',
      });
      onComplete();
    } catch (err) {
      console.error('Final save failed', err);
      // Even if save fails, we might want to let them continue or show error
      // For now, let's assume we want to unblock
      onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <h2 className={styles.title}>Reflect</h2>
      </div>
      
      <p className={styles.prompt}>
        {content.prompt || "Pause. Write what you understand so far."}
      </p>

      <div className={styles.editorWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="I understand that..."
        />
        <div className={styles.status}>
          {isSaving ? 'Saving...' : text === lastSavedText && text.length > 0 ? 'Saved' : ''}
        </div>
      </div>

      <div className={styles.actions}>
        <button 
          className={styles.continueButton}
          onClick={handleContinue}
          disabled={isSaving}
        >
          {text.trim() ? "Save & Continue" : "Skip"}
        </button>
      </div>
    </div>
  );
}
