'use client';

/**
 * ReflectionCheckpoint Component
 * 
 * A simple reflection checkpoint for pausing and writing thoughts.
 * This is similar to SnapshotCheckpoint but optimized for adaptive checkpoints.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import styles from './ReflectionCheckpoint.module.css';

interface ReflectionContent {
  type: 'snapshot' | 'REFLECTION';
  prompt?: string;
  context?: string;
  question?: string;
  characterLimit?: number;
  followUp?: string;
}

interface ReflectionCheckpointProps {
  content: ReflectionContent;
  title?: string;
  estimatedTime?: string;
  onComplete: () => void;
  onSaveArtifact?: (data: {
    type: 'reflection';
    userText: string;
    wordCount: number;
  }) => Promise<void>;
}

export function ReflectionCheckpoint({
  content,
  title,
  estimatedTime,
  onComplete,
  onSaveArtifact,
}: ReflectionCheckpointProps) {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get the prompt - could come from different properties
  const prompt = content.prompt || content.question || 'Pause and reflect on what you just learned.';
  const maxChars = content.characterLimit || 1000;

  // Auto-focus
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Word count
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  // Handle completion
  const handleComplete = useCallback(async () => {
    if (text.trim() && onSaveArtifact) {
      setIsSaving(true);
      try {
        await onSaveArtifact({
          type: 'reflection',
          userText: text,
          wordCount,
        });
      } catch (err) {
        console.error('Failed to save reflection:', err);
      } finally {
        setIsSaving(false);
      }
    }
    onComplete();
  }, [text, wordCount, onComplete, onSaveArtifact]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.typeIcon}>💭</span>
          <span className={styles.typeLabel}>Reflect</span>
        </div>
        {estimatedTime && (
          <span className={styles.estimatedTime}>~{estimatedTime}</span>
        )}
      </div>

      {/* Title */}
      {title && <h3 className={styles.title}>{title}</h3>}

      {/* Prompt */}
      <p className={styles.prompt}>{prompt}</p>

      {/* Context */}
      {content.context && (
        <div className={styles.contextBox}>
          <p className={styles.context}>{content.context}</p>
        </div>
      )}

      {/* Text Area */}
      <div className={styles.editorWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, maxChars))}
          placeholder="I understand that..."
          maxLength={maxChars}
        />
        <div className={styles.charCount}>
          <span>{wordCount} words</span>
          <span>{text.length}/{maxChars} chars</span>
        </div>
      </div>

      {/* Follow-up prompt */}
      {content.followUp && text.length > 50 && (
        <p className={styles.followUp}>💡 {content.followUp}</p>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.skipButton}
          onClick={onComplete}
          disabled={isSaving}
        >
          Skip
        </button>
        <button
          className={`${styles.continueButton} ${text.trim() ? styles.hasContent : ''}`}
          onClick={handleComplete}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : text.trim() ? 'Save & Continue' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
