'use client';

/**
 * PracticeCheckpoint Component
 *
 * Displays a practice problem suggestion (LeetCode, HackerRank, etc.)
 * detected from the video content. Users can open the problem in a
 * sidebar or new tab to practice while watching.
 *
 * Design Philosophy:
 * - Encourage hands-on practice without breaking flow
 * - Show relevance through match reason
 * - Provide multiple engagement options (sidebar, new tab, skip)
 */

import { useState, useCallback } from 'react';
import styles from './PracticeCheckpoint.module.css';
import type { PracticeResourceContent } from '@/hooks/useDeepFocus';

interface PracticeCheckpointProps {
  content: PracticeResourceContent;
  onComplete: () => void;
  onOpenSidebar?: (url: string, title: string) => void;
  onDismiss?: () => void;
}

/**
 * Get platform icon/emoji
 */
function getPlatformIcon(platform: PracticeResourceContent['platform']): string {
  switch (platform) {
    case 'leetcode':
      return '🟧';
    case 'hackerrank':
      return '🟩';
    case 'codewars':
      return '🟥';
    default:
      return '💻';
  }
}

/**
 * Get platform display name
 */
function getPlatformName(platform: PracticeResourceContent['platform']): string {
  switch (platform) {
    case 'leetcode':
      return 'LeetCode';
    case 'hackerrank':
      return 'HackerRank';
    case 'codewars':
      return 'Codewars';
    default:
      return 'Practice';
  }
}

export function PracticeCheckpoint({
  content,
  onComplete,
  onOpenSidebar,
  onDismiss,
}: PracticeCheckpointProps) {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenInNewTab = useCallback(() => {
    setIsOpening(true);
    window.open(content.url, '_blank', 'noopener,noreferrer');
    // Mark as complete after opening
    setTimeout(() => {
      setIsOpening(false);
      onComplete();
    }, 500);
  }, [content.url, onComplete]);

  const handleOpenInSidebar = useCallback(() => {
    if (onOpenSidebar) {
      onOpenSidebar(content.url, content.title);
      onComplete();
    } else {
      // Fallback to new tab if sidebar not available
      handleOpenInNewTab();
    }
  }, [content.url, content.title, onOpenSidebar, onComplete, handleOpenInNewTab]);

  const handleSkip = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    } else {
      onComplete();
    }
  }, [onDismiss, onComplete]);

  const isHighConfidence = content.matchConfidence >= 0.85;
  const confidencePercent = Math.round(content.matchConfidence * 100);

  return (
    <div className={styles.practiceCheckpoint}>
      {/* Problem Header */}
      <div className={styles.header}>
        <div className={`${styles.platformIcon} ${styles[content.platform]}`}>
          {getPlatformIcon(content.platform)}
        </div>
        <div className={styles.problemInfo}>
          <h3 className={styles.problemTitle}>{content.title}</h3>
          <div className={styles.problemMeta}>
            <span className={`${styles.difficulty} ${styles[content.difficulty]}`}>
              {content.difficulty}
            </span>
            <span className={`${styles.matchBadge} ${isHighConfidence ? styles.highConfidence : ''}`}>
              {isHighConfidence ? '✓ ' : ''}
              {confidencePercent}% match
            </span>
            <span className={styles.platform}>
              {getPlatformName(content.platform)}
            </span>
          </div>
        </div>
      </div>

      {/* Match Reason */}
      <div className={styles.matchReason}>
        <div className={styles.matchReasonLabel}>Why this problem?</div>
        <div className={styles.matchReasonText}>{content.matchReason}</div>
      </div>

      {/* Encouragement */}
      <p className={styles.encourageMessage}>
        <strong>Practice while you watch!</strong> Try solving this problem to reinforce
        what you're learning. You can keep the video playing or pause it.
      </p>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          onClick={handleOpenInNewTab}
          disabled={isOpening}
        >
          <span className={styles.icon}>↗</span>
          Open in New Tab
        </button>
        {onOpenSidebar && (
          <button
            className={styles.secondaryButton}
            onClick={handleOpenInSidebar}
            disabled={isOpening}
          >
            <span className={styles.icon}>◧</span>
            Open in Sidebar
          </button>
        )}
      </div>

      <button
        className={styles.skipButton}
        onClick={handleSkip}
        disabled={isOpening}
      >
        Skip for now
      </button>

      <div className={styles.keyboardHint}>
        Press <kbd>Esc</kbd> to dismiss
      </div>
    </div>
  );
}
