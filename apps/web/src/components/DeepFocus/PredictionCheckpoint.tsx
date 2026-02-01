'use client';

/**
 * PredictionCheckpoint Component
 * 
 * "Prediction Before Reveal" - Pauser's signature cognitive checkpoint.
 * 
 * Flow:
 * 1. Video pauses BEFORE an explanation/reveal
 * 2. User writes their prediction of what will happen
 * 3. Prediction is saved as an artifact
 * 4. Video continues to the reveal
 * 5. After reveal timestamp: shows comparison view
 * 6. User can optionally add a reflection
 * 
 * Design: Calm, focused, no judgment.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import styles from './CognitiveCheckpoint.module.css';

interface PredictionContent {
  type: 'prediction';
  prompt: string;
  context: string;
  revealTimestamp: number;
  /** Internal: indicates reveal mode */
  _revealMode?: boolean;
  /** Internal: user's original prediction */
  _userPrediction?: string;
}

interface PredictionCheckpointProps {
  content: PredictionContent;
  onComplete: () => void;
  onSaveArtifact: (data: {
    type: 'prediction';
    userText: string;
    followUpText?: string;
    promptUsed: string;
    revealTimestampSeconds: number;
  }) => Promise<void>;
  onContinueToReveal?: (userText: string) => void;
}

export function PredictionCheckpoint({
  content,
  onComplete,
  onSaveArtifact,
  onContinueToReveal,
}: PredictionCheckpointProps) {
  const [prediction, setPrediction] = useState('');
  const [reflection, setReflection] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isRevealMode = content._revealMode === true;
  const userPrediction = content._userPrediction || prediction;

  // Focus text area on mount
  useEffect(() => {
    if (!isRevealMode && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isRevealMode]);

  // Handle initial prediction submission (before reveal)
  const handleContinueToReveal = useCallback(async () => {
    if (!prediction.trim()) return;

    setIsSaving(true);
    try {
      // Save the prediction artifact
      await onSaveArtifact({
        type: 'prediction',
        userText: prediction.trim(),
        promptUsed: content.prompt,
        revealTimestampSeconds: content.revealTimestamp,
      });

      // Continue to reveal
      if (onContinueToReveal) {
        onContinueToReveal(prediction.trim());
      }
    } catch (error) {
      console.error('[PredictionCheckpoint] Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [prediction, content.prompt, content.revealTimestamp, onSaveArtifact, onContinueToReveal]);

  // Handle final completion (after reveal, with optional reflection)
  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    try {
      // If there's a reflection, update the artifact
      if (reflection.trim()) {
        await onSaveArtifact({
          type: 'prediction',
          userText: userPrediction,
          followUpText: reflection.trim(),
          promptUsed: content.prompt,
          revealTimestampSeconds: content.revealTimestamp,
        });
      }

      setIsSaved(true);
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (error) {
      console.error('[PredictionCheckpoint] Failed to save reflection:', error);
      onComplete();
    } finally {
      setIsSaving(false);
    }
  }, [reflection, userPrediction, content.prompt, content.revealTimestamp, onSaveArtifact, onComplete]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (isRevealMode) {
          handleComplete();
        } else if (prediction.trim()) {
          handleContinueToReveal();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRevealMode, prediction, handleComplete, handleContinueToReveal]);

  // Render reveal mode (comparison view)
  if (isRevealMode) {
    return (
      <div className={styles.container}>
        <div className={`${styles.typeBadge} ${styles.prediction}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Prediction Revealed
        </div>

        <div className={styles.revealSection}>
          <div className={styles.revealTitle}>Your Prediction vs What Happened</div>
          
          <div className={styles.comparisonGrid}>
            <div className={styles.comparisonCard}>
              <div className={`${styles.comparisonLabel} ${styles.prediction}`}>
                Your Prediction
              </div>
              <p className={styles.comparisonText}>{userPrediction}</p>
            </div>
            
            <div className={styles.comparisonCard}>
              <div className={`${styles.comparisonLabel} ${styles.actual}`}>
                What Actually Happened
              </div>
              <p className={styles.comparisonText}>
                {content.context}
              </p>
            </div>
          </div>

          <div className={styles.reflectionSection}>
            <label className={styles.reflectionLabel}>
              Optional: Briefly reflect on the difference (or skip)
            </label>
            <textarea
              className={styles.reflectionInput}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What surprised you? What did you learn?"
              rows={3}
            />
          </div>
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
              Skip reflection
            </button>
            <button
              className={styles.saveButton}
              onClick={handleComplete}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render initial prediction mode
  return (
    <div className={styles.container}>
      <div className={`${styles.typeBadge} ${styles.prediction}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        Prediction
      </div>

      {content.context && (
        <div className={styles.context}>
          {content.context}
        </div>
      )}

      <p className={styles.prompt}>{content.prompt}</p>

      <div className={styles.inputSection}>
        <textarea
          ref={textAreaRef}
          className={styles.textArea}
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          placeholder="Write your prediction here..."
          rows={4}
        />
        <div className={styles.inputHelpers}>
          <span className={styles.wordCount}>
            {prediction.trim().split(/\s+/).filter(Boolean).length} words
          </span>
        </div>
      </div>

      <div className={styles.encouragement}>
        There's no wrong answer. This is about engaging with ideas before they're revealed.
      </div>

      <div className={styles.actions}>
        <button
          className={styles.continueButton}
          onClick={handleContinueToReveal}
          disabled={!prediction.trim() || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save & See What Happens'}
        </button>
      </div>
    </div>
  );
}
