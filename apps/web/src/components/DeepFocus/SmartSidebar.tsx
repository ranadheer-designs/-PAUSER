'use client';

/**
 * SmartSidebar Component
 * 
 * The collapsible sidebar that displays:
 * 1. Active checkpoint (rendered inline, not as modal overlay)
 * 2. Notes panel (always visible at bottom)
 * 3. Mini video preview when collapsed
 * 
 * Replaces the overlay-based checkpoint system with inline rendering.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { Checkpoint, CheckpointContent, PredictionContent, ExplanationContent, OneSentenceRuleContent, SnapshotContent, PracticeResourceContent } from '@/hooks/useDeepFocus';
import type { Note } from '@pauser/common';
import { createArtifact } from '@/actions/artifactActions';
import { NotesPanel } from './NotesPanel';
import { PracticeCheckpoint } from './PracticeCheckpoint';
import { SnapshotCheckpoint } from './SnapshotCheckpoint';
import { PredictionCheckpoint } from './PredictionCheckpoint';
import { ExplainItBackCheckpoint } from './ExplainItBackCheckpoint';
import { OneSentenceRuleCheckpoint } from './OneSentenceRuleCheckpoint';
import styles from './SmartSidebar.module.css';

// Re-export content types for convenience
export type { CheckpointContent };

interface NoteData {
  title?: string;
  body: string;
}

export interface SmartSidebarProps {
  // Checkpoint props
  activeCheckpoint: Checkpoint | null;
  contentId: string | null;
  onCheckpointComplete: (id: string, timeSpentMs?: number) => void;
  onCheckpointDismiss: () => void;
  onContinueToReveal?: (checkpointId: string, userText: string, revealTimestamp: number) => void;
  
  // Collapse state
  collapsed: boolean;
  onToggleCollapse: () => void;
  
  // Notes props
  videoId: string;
  notes: Note[];
  currentTime: number;
  onTakeNote: () => Promise<null>;
  onNoteClick: (note: Note) => void;
  onNoteSave: (noteId: string | undefined, data: NoteData) => Promise<void>;
  onNoteComplete: () => Promise<void>;
  onEditingChange: (editing: boolean) => void;
  triggerTakeNoteRef: React.MutableRefObject<(() => void) | null>;
  
  // Checkpoint toggle (passed through to NotesPanel)
  checkpointsEnabled: boolean;
  onToggleCheckpoints: () => void;
  isCheckpointsPending: boolean;
}

/**
 * Get icon for checkpoint type
 */
function getCheckpointIcon(type: string): string {
  switch (type) {
    case 'prediction': return '🔮';
    case 'explanation': return '💬';
    case 'one_sentence_rule': return '📝';
    case 'snapshot': return '💭';
    case 'practice_resource': return '💻';
    default: return '📍';
  }
}

/**
 * Get label for checkpoint type
 */
function getCheckpointLabel(type: string): string {
  switch (type) {
    case 'prediction': return 'Prediction';
    case 'explanation': return 'Explain It Back';
    case 'one_sentence_rule': return 'One Sentence';
    case 'snapshot': return 'Understanding Snapshot';
    case 'practice_resource': return 'Practice Problem';
    default: return 'Checkpoint';
  }
}

export function SmartSidebar({
  activeCheckpoint,
  contentId,
  onCheckpointComplete,
  onCheckpointDismiss,
  onContinueToReveal,
  collapsed,
  onToggleCollapse,
  videoId,
  notes,
  currentTime,
  onTakeNote,
  onNoteClick,
  onNoteSave,
  onNoteComplete,
  onEditingChange,
  triggerTakeNoteRef,
  checkpointsEnabled,
  onToggleCheckpoints,
  isCheckpointsPending,
}: SmartSidebarProps) {
  const startTimeRef = useRef<number>(Date.now());

  // Handle checkpoint completion with time tracking
  const handleCheckpointComplete = useCallback(() => {
    if (activeCheckpoint) {
      const timeSpentMs = Date.now() - startTimeRef.current;
      onCheckpointComplete(activeCheckpoint.id, timeSpentMs);
    }
  }, [activeCheckpoint, onCheckpointComplete]);

  // Handle saving artifacts for predictions
  const handleSavePredictionArtifact = useCallback(async (data: {
    type: 'prediction';
    userText: string;
    followUpText?: string;
    promptUsed: string;
    revealTimestampSeconds: number;
  }) => {
    if (!contentId || !activeCheckpoint) {
      console.warn('[SmartSidebar] Cannot save artifact: contentId or checkpoint is missing');
      return;
    }

    const content = activeCheckpoint.content as PredictionContent;
    await createArtifact({
      contentId,
      checkpointId: activeCheckpoint.id,
      type: 'prediction',
      userText: data.userText,
      followUpText: data.followUpText,
      promptUsed: data.promptUsed,
      revealTimestampSeconds: data.revealTimestampSeconds,
      timestampSeconds: content.revealTimestamp - 10,
    });
  }, [contentId, activeCheckpoint]);

  // Handle continue to reveal for predictions
  const handleContinueToReveal = useCallback((userText: string) => {
    if (!activeCheckpoint) return;
    const content = activeCheckpoint.content as PredictionContent;
    if (onContinueToReveal) {
      onContinueToReveal(activeCheckpoint.id, userText, content.revealTimestamp);
    }
  }, [activeCheckpoint, onContinueToReveal]);

  // Handle saving artifacts for explanations
  const handleSaveExplanationArtifact = useCallback(async (data: {
    type: 'explanation';
    userText: string;
    promptUsed: string;
    conceptName: string;
    targetAudience: 'junior' | 'past_self' | 'friend';
  }) => {
    if (!contentId || !activeCheckpoint) {
      console.warn('[SmartSidebar] Cannot save artifact: contentId or checkpoint is missing');
      return;
    }

    await createArtifact({
      contentId,
      checkpointId: activeCheckpoint.id,
      type: 'explanation',
      userText: data.userText,
      promptUsed: data.promptUsed,
      conceptName: data.conceptName,
      targetAudience: data.targetAudience,
      timestampSeconds: Math.floor(Date.now() / 1000),
    });
  }, [contentId, activeCheckpoint]);

  // Handle saving artifacts for one-sentence rules
  const handleSaveOneSentenceArtifact = useCallback(async (data: {
    type: 'one_sentence_rule';
    userText: string;
    conceptName: string;
    requiredKeyword: string;
    maxWords: number;
  }) => {
    if (!contentId || !activeCheckpoint) {
      console.warn('[SmartSidebar] Cannot save artifact: contentId or checkpoint is missing');
      return;
    }

    await createArtifact({
      contentId,
      checkpointId: activeCheckpoint.id,
      type: 'one_sentence_rule',
      userText: data.userText,
      conceptName: data.conceptName,
      requiredKeyword: data.requiredKeyword,
      maxWords: data.maxWords,
      timestampSeconds: Math.floor(Date.now() / 1000),
    });
  }, [contentId, activeCheckpoint]);

  // Handle saving artifacts for snapshots
  const handleSaveSnapshotArtifact = useCallback(async (data: {
    type: 'snapshot';
    userText: string;
    conceptName: string;
  }) => {
    if (!contentId || !activeCheckpoint) {
      console.warn('[SmartSidebar] Cannot save artifact: contentId or checkpoint is missing');
      return;
    }

    await createArtifact({
      contentId,
      checkpointId: activeCheckpoint.id,
      type: 'snapshot',
      userText: data.userText,
      conceptName: data.conceptName,
      timestampSeconds: Math.floor(Date.now() / 1000),
    });
  }, [contentId, activeCheckpoint]);

  // Render the appropriate checkpoint component based on type
  const renderCheckpointContent = useMemo(() => {
    if (!activeCheckpoint || !activeCheckpoint.content) {
      return null;
    }

    const content = activeCheckpoint.content;

    switch (content.type) {
      case 'practice_resource':
        return (
          <PracticeCheckpoint
            content={content as PracticeResourceContent}
            onComplete={handleCheckpointComplete}
            onDismiss={onCheckpointDismiss}
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
        
      default:
        return (
          <div className={styles.noCheckpoint}>
            <p>Unknown checkpoint type</p>
          </div>
        );
    }
  }, [activeCheckpoint, handleCheckpointComplete, onCheckpointDismiss, handleSaveSnapshotArtifact, handleSavePredictionArtifact, handleContinueToReveal, handleSaveExplanationArtifact, handleSaveOneSentenceArtifact]);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Collapse Toggle */}
      <button 
        className={styles.collapseToggle}
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Collapsed Content */}
      <div className={styles.collapsedContent}>
        {activeCheckpoint && (
          <div className={styles.collapsedIcon} title={activeCheckpoint.title}>
            {getCheckpointIcon(activeCheckpoint.type)}
          </div>
        )}
        <div className={styles.collapsedIcon} title="Notes">
          📝
        </div>
        {notes.length > 0 && (
          <div className={styles.collapsedBadge}>{notes.length}</div>
        )}
      </div>

      {/* Expanded Content */}
      {!collapsed && (
        <>
          {/* Active Checkpoint Panel */}
          <div className={`${styles.checkpointPanel} ${!activeCheckpoint ? styles.checkpointPanelInactive : ''}`}>
            {activeCheckpoint ? (
              <div className={styles.checkpointActive}>
                <div className={styles.checkpointHeader}>
                  <span className={styles.checkpointIcon}>
                    {getCheckpointIcon(activeCheckpoint.type)}
                  </span>
                  <span className={styles.checkpointLabel}>
                    {getCheckpointLabel(activeCheckpoint.type)}
                  </span>
                </div>
                <h3 className={styles.checkpointTitle}>
                  {activeCheckpoint.title}
                </h3>
                <div className={styles.checkpointContent}>
                  {renderCheckpointContent}
                </div>
              </div>
            ) : (
              <div className={styles.noCheckpoint}>
                <div className={styles.noCheckpointIcon}>📚</div>
                <p className={styles.noCheckpointText}>
                  {checkpointsEnabled 
                    ? 'Keep watching - a checkpoint will appear soon!'
                    : 'Enable checkpoints to start active learning'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={styles.divider} />

          {/* Notes Section */}
          <div className={styles.notesSection}>
            <NotesPanel
              contentId={videoId}
              notes={notes}
              currentTime={currentTime}
              onTakeNote={onTakeNote}
              onNoteClick={onNoteClick}
              onNoteSave={onNoteSave}
              onNoteComplete={onNoteComplete}
              onEditingChange={onEditingChange}
              triggerTakeNoteRef={triggerTakeNoteRef}
              checkpointsEnabled={checkpointsEnabled}
              onToggleCheckpoints={onToggleCheckpoints}
              isCheckpointsPending={isCheckpointsPending}
            />
          </div>
        </>
      )}
    </aside>
  );
}
