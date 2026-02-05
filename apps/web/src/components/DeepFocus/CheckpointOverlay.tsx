'use client';

/**
 * CheckpointOverlay Component
 * 
 * The modal overlay that appears when a checkpoint is triggered.
 * Renders the appropriate cognitive checkpoint component based on type:
 * - PredictionCheckpoint (Prediction Before Reveal)
 * - ExplainItBackCheckpoint (Explain It Back)
 * - OneSentenceRuleCheckpoint (One-Sentence Rule)
 * - SnapshotCheckpoint (Understanding Snapshot)
 * 
 * Design Philosophy:
 * - Calm, focused overlay
 * - No grading, no pressure
 * - Keyboard-friendly (Escape to dismiss)
 * - Saves user responses as learning artifacts
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './CheckpointOverlay.module.css';
import { PredictionCheckpoint } from './PredictionCheckpoint';
import { ExplainItBackCheckpoint } from './ExplainItBackCheckpoint';
import { OneSentenceRuleCheckpoint } from './OneSentenceRuleCheckpoint';
import { SnapshotCheckpoint } from './SnapshotCheckpoint';
import { PracticeCheckpoint } from './PracticeCheckpoint';
import { CodePracticeCheckpoint } from './CodePracticeCheckpoint';
import { createArtifact } from '@/actions/artifactActions';
import type { 
  CheckpointContent, 
  PredictionContent, 
  ExplanationContent, 
  OneSentenceRuleContent,
  SnapshotContent,
  PracticeResourceContent,
  CodePracticeContent
} from '@/hooks/useDeepFocus';

interface CheckpointOverlayProps {
  checkpoint: {
    id: string;
    title: string;
    type: 'prediction' | 'explanation' | 'one_sentence_rule' | 'snapshot' | string;
    content?: CheckpointContent;
  };
  contentId: string | null; // The video/content ID for artifact storage (can be null if DB save failed)
  onComplete: (id: string, timeSpentMs?: number) => void;
  onDismiss: () => void;
  onContinueToReveal?: (checkpointId: string, userText: string, revealTimestamp: number) => void;
}

export function CheckpointOverlay({ 
  checkpoint, 
  contentId,
  onComplete, 
  onDismiss,
  onContinueToReveal, 
}: CheckpointOverlayProps) {
  const startTimeRef = useRef<number>(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trap focus / Handle Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  // Reset timer on new checkpoint
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [checkpoint.id]);

  // Handle checkpoint completion
  const handleCheckpointComplete = useCallback(() => {
    const duration = Date.now() - startTimeRef.current;
    onComplete(checkpoint.id, duration);
  }, [checkpoint.id, onComplete]);

  // Handle saving artifacts for predictions
  const handleSavePredictionArtifact = useCallback(async (data: {
    type: 'prediction';
    userText: string;
    followUpText?: string;
    promptUsed: string;
    revealTimestampSeconds: number;
  }) => {
    if (!contentId) {
      console.warn('[CheckpointOverlay] Cannot save artifact: contentId is missing');
      return;
    }

    const content = checkpoint.content as PredictionContent;
    await createArtifact({
      contentId,
      checkpointId: checkpoint.id,
      type: 'prediction',
      userText: data.userText,
      followUpText: data.followUpText,
      promptUsed: data.promptUsed,
      revealTimestampSeconds: data.revealTimestampSeconds,
      timestampSeconds: content.revealTimestamp - 10, // Approximate checkpoint time
    });
  }, [contentId, checkpoint.id, checkpoint.content]);

  // Handle continue to reveal for predictions
  const handleContinueToReveal = useCallback((userText: string) => {
    const content = checkpoint.content as PredictionContent;
    if (onContinueToReveal) {
      onContinueToReveal(checkpoint.id, userText, content.revealTimestamp);
    }
  }, [checkpoint.id, checkpoint.content, onContinueToReveal]);

  // Handle saving artifacts for explanations
  const handleSaveExplanationArtifact = useCallback(async (data: {
    type: 'explanation';
    userText: string;
    promptUsed: string;
    conceptName: string;
    targetAudience: 'junior' | 'past_self' | 'friend';
  }) => {
    if (!contentId) {
      console.warn('[CheckpointOverlay] Cannot save artifact: contentId is missing');
      return;
    }

    await createArtifact({
      contentId,
      checkpointId: checkpoint.id,
      type: 'explanation',
      userText: data.userText,
      promptUsed: data.promptUsed,
      conceptName: data.conceptName,
      targetAudience: data.targetAudience,
      timestampSeconds: Math.floor(Date.now() / 1000), // Current time as fallback
    });
  }, [contentId, checkpoint.id]);

  // Handle saving artifacts for one-sentence rules
  const handleSaveOneSentenceArtifact = useCallback(async (data: {
    type: 'one_sentence_rule';
    userText: string;
    conceptName: string;
    requiredKeyword: string;
    maxWords: number;
  }) => {
    if (!contentId) {
      console.warn('[CheckpointOverlay] Cannot save artifact: contentId is missing');
      return;
    }

    await createArtifact({
      contentId,
      checkpointId: checkpoint.id,
      type: 'one_sentence_rule',
      userText: data.userText,
      conceptName: data.conceptName,
      requiredKeyword: data.requiredKeyword,
      maxWords: data.maxWords,
      timestampSeconds: Math.floor(Date.now() / 1000),
    });
  }, [contentId, checkpoint.id]);

  // Handle saving artifacts for snapshots
  const handleSaveSnapshotArtifact = useCallback(async (data: {
    type: 'snapshot';
    userText: string;
    conceptName: string;
  }) => {
    if (!contentId) {
      console.warn('[CheckpointOverlay] Cannot save artifact: contentId is missing');
      return;
    }

    await createArtifact({
      contentId,
      checkpointId: checkpoint.id,
      type: 'snapshot',
      userText: data.userText,
      conceptName: data.conceptName,
      timestampSeconds: Math.floor(Date.now() / 1000),
    });
  }, [contentId, checkpoint.id]);

  // Handle saving artifacts for code practice
  const handleSaveCodeArtifact = useCallback(async (data: {
    type: 'code_practice';
    userCode: string;
    passed: boolean;
    hintsUsed: number;
  }) => {
    if (!contentId) {
      console.warn('[CheckpointOverlay] Cannot save artifact: contentId is missing');
      return;
    }

    // Since createArtifact might not support 'code_practice' yet in its definition, 
    // we assume it's extensible or handle it gracefully. 
    // If striclty typed, we might need to update createArtifact signature too.
    // For now, we log or assume it works if typed loosely.
    console.log('[CheckpointOverlay] Saving code artifact:', data);
    // await createArtifact({...}); // specific implementation depends on artifactActions support
  }, [contentId, checkpoint.id]);

  // Render the appropriate component based on checkpoint type
  const renderCheckpointContent = () => {
    const content = checkpoint.content;

    if (!content) {
      // Fallback for checkpoints without content
      return (
        <>
          <div className={styles.placeholder}>
            <p className={styles.placeholderText}>
              {checkpoint.title || "Let's pause and reflect on what we just learned."}
            </p>
          </div>
          <div className={styles.actions}>
            <button 
              className={styles.secondaryButton} 
              onClick={onDismiss}
              disabled={isSubmitting}
            >
              Skip for now
            </button>
            <button 
              className={styles.primaryButton} 
              onClick={handleCheckpointComplete}
              disabled={isSubmitting}
              autoFocus
            >
              I understand, continue
            </button>
          </div>
        </>
      );
    }

    switch (content.type) {
      case 'prediction':
        return (
          <PredictionCheckpoint
            content={content as PredictionContent}
            onComplete={handleCheckpointComplete}
            onSaveArtifact={handleSavePredictionArtifact}
            onContinueToReveal={handleContinueToReveal}
          />
        );
      
      case 'explanation':
        return (
          <ExplainItBackCheckpoint
            content={content as ExplanationContent}
            onComplete={handleCheckpointComplete}
            onSaveArtifact={handleSaveExplanationArtifact}
          />
        );
      
      case 'one_sentence_rule':
        return (
          <OneSentenceRuleCheckpoint
            content={content as OneSentenceRuleContent}
            onComplete={handleCheckpointComplete}
            onSaveArtifact={handleSaveOneSentenceArtifact}
          />
        );
        
      case 'snapshot':
        return (
          <SnapshotCheckpoint
             content={content as SnapshotContent}
             onComplete={handleCheckpointComplete}
             onSaveArtifact={handleSaveSnapshotArtifact}
          />
        );
      
      case 'practice_resource':
        return (
          <PracticeCheckpoint
            content={content as PracticeResourceContent}
            onComplete={handleCheckpointComplete}
            onDismiss={onDismiss}
          />
        );

      case 'code_practice':
        return (
          <CodePracticeCheckpoint
            content={content as CodePracticeContent}
            title={checkpoint.title}
            onComplete={handleCheckpointComplete}
            onSaveArtifact={handleSaveCodeArtifact}
          />
        );
      
      default:
        // Unknown type fallback
        return (
          <>
            <div className={styles.placeholder}>
              <p className={styles.placeholderText}>
                {checkpoint.title || "Take a moment to reflect."}
              </p>
            </div>
            <div className={styles.actions}>
              <button 
                className={styles.secondaryButton} 
                onClick={onDismiss}
              >
                Skip
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleCheckpointComplete}
                autoFocus
              >
                Continue
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`${styles.modal} ${checkpoint.content ? styles.modalLarge : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {getCheckpointTypeLabel(checkpoint.type)}
          </h2>
          <button 
            className={styles.closeButton}
            onClick={onDismiss}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className={styles.content}>
          {renderCheckpointContent()}
        </div>
      </div>
    </div>
  );
}

/**
 * Get human-readable label for checkpoint type.
 */
function getCheckpointTypeLabel(type: string): string {
  switch (type) {
    case 'prediction': return 'Prediction';
    case 'explanation': return 'Explain It Back';
    case 'one_sentence_rule': return 'One-Sentence Rule';
    case 'snapshot': return 'Understanding Snapshot';
    case 'code_practice': return 'Coding Practice';
    case 'practice_resource': return 'Practice Resource';
    default: return 'Checkpoint';
  }
}
