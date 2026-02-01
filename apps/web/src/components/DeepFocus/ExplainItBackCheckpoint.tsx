'use client';

/**
 * ExplainItBackCheckpoint Component
 * 
 * "Explain It Back" - A cognitive checkpoint for articulation.
 * 
 * Flow:
 * 1. Video pauses AFTER an explanation
 * 2. User teaches the concept back in their own words
 * 3. No grading, no judgment - focus on articulation
 * 4. Response saved as a learning artifact
 * 
 * Target audiences:
 * - "Junior developer" (simplify, avoid jargon)
 * - "Your past self" (personal, relatable)
 * - "A friend" (casual, accessible)
 * 
 * Design: Calm, focused, supportive.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import styles from './CognitiveCheckpoint.module.css';

interface ExplanationContent {
  type: 'explanation';
  prompt: string;
  conceptName: string;
  targetAudience: 'junior' | 'past_self' | 'friend';
}

interface ExplainItBackCheckpointProps {
  content: ExplanationContent;
  onComplete: () => void;
  onSaveArtifact: (data: {
    type: 'explanation';
    userText: string;
    promptUsed: string;
    conceptName: string;
    targetAudience: 'junior' | 'past_self' | 'friend';
  }) => Promise<void>;
}

const AUDIENCE_OPTIONS = [
  { value: 'junior' as const, label: 'Junior Developer', description: 'Simplify, avoid jargon' },
  { value: 'past_self' as const, label: 'Your Past Self', description: 'Personal, relatable' },
  { value: 'friend' as const, label: 'A Friend', description: 'Casual, accessible' },
];

export function ExplainItBackCheckpoint({
  content,
  onComplete,
  onSaveArtifact,
}: ExplainItBackCheckpointProps) {
  const [explanation, setExplanation] = useState('');
  const [selectedAudience, setSelectedAudience] = useState<'junior' | 'past_self' | 'friend'>(
    content.targetAudience || 'junior'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Focus text area on mount
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, []);

  // Get the appropriate prompt based on audience
  const getPrompt = () => {
    switch (selectedAudience) {
      case 'junior':
        return `Explain "${content.conceptName}" to a junior developer`;
      case 'past_self':
        return `Explain "${content.conceptName}" to your past self`;
      case 'friend':
        return `Explain "${content.conceptName}" to a friend`;
      default:
        return content.prompt;
    }
  };

  // Word count
  const wordCount = explanation.trim().split(/\s+/).filter(Boolean).length;

  // Handle save and complete
  const handleSave = useCallback(async () => {
    if (!explanation.trim()) return;

    setIsSaving(true);
    try {
      await onSaveArtifact({
        type: 'explanation',
        userText: explanation.trim(),
        promptUsed: getPrompt(),
        conceptName: content.conceptName,
        targetAudience: selectedAudience,
      });

      setIsSaved(true);
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (error) {
      console.error('[ExplainItBackCheckpoint] Failed to save:', error);
      onComplete();
    } finally {
      setIsSaving(false);
    }
  }, [explanation, selectedAudience, content.conceptName, onSaveArtifact, onComplete]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (explanation.trim()) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [explanation, handleSave]);

  return (
    <div className={styles.container}>
      <div className={`${styles.typeBadge} ${styles.explanation}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Explain It Back
      </div>

      <p className={styles.conceptName}>
        Concept: <span className={styles.conceptHighlight}>{content.conceptName}</span>
      </p>

      <div className={styles.audienceSection}>
        <label className={styles.audienceLabel}>Explain this to:</label>
        <div className={styles.audienceOptions}>
          {AUDIENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`${styles.audienceOption} ${selectedAudience === option.value ? styles.selected : ''}`}
              onClick={() => setSelectedAudience(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.prompt}>{getPrompt()}</p>

      <div className={styles.inputSection}>
        <textarea
          ref={textAreaRef}
          className={styles.textArea}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder={`If I had to explain ${content.conceptName} to ${selectedAudience === 'junior' ? 'someone just starting out' : selectedAudience === 'past_self' ? 'myself a year ago' : 'a friend over coffee'}...`}
          rows={5}
        />
        <div className={styles.inputHelpers}>
          <span className={styles.wordCount}>{wordCount} words</span>
        </div>
      </div>

      <div className={styles.encouragement}>
        There's no grading here. Teaching back is one of the most powerful ways to learn.
      </div>

      {isSaved ? (
        <div className={styles.savedConfirmation}>
          <svg className={styles.savedIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Saved to your learning artifacts
        </div>
      ) : (
        <div className={styles.actions}>
          <button
            className={styles.skipButton}
            onClick={onComplete}
            disabled={isSaving}
          >
            Skip for now
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={!explanation.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
