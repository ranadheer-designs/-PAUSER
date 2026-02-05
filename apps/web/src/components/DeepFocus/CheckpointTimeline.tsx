'use client';

/**
 * CheckpointTimeline Component
 * 
 * A visual timeline showing checkpoint markers on the video progress bar.
 * Features:
 * - Checkpoint markers with status (pending/completed)
 * - Tooltips with checkpoint info
 * - Click-to-seek functionality
 * - Current progress indicator
 */

import React, { useMemo } from 'react';
import styles from './CheckpointTimeline.module.css';

interface Checkpoint {
  id: string;
  timestamp: number;
  title: string;
  type: string;
  completed: boolean;
  estimatedTime?: string;
  content?: unknown; // Optional for compatibility
}

interface CheckpointTimelineProps {
  checkpoints: Checkpoint[];
  currentTime: number;
  duration: number;
  onCheckpointClick: (checkpoint: Checkpoint) => void;
  onSeek?: (time: number) => void;
}

/**
 * Format seconds to mm:ss
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get icon for checkpoint type
 */
function getCheckpointIcon(type: string): string {
  switch (type) {
    case 'code_practice':
    case 'CODE_PRACTICE':
      return '💻';
    case 'concept_quiz':
    case 'CONCEPT_QUIZ':
      return '🧠';
    case 'snapshot':
    case 'REFLECTION':
      return '💭';
    case 'practice_resource':
      return '📚';
    case 'DESIGN_PRACTICE':
      return '🎨';
    default:
      return '📍';
  }
}

export function CheckpointTimeline({
  checkpoints,
  currentTime,
  duration,
  onCheckpointClick,
  onSeek,
}: CheckpointTimelineProps) {
  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (duration <= 0) return 0;
    return Math.min((currentTime / duration) * 100, 100);
  }, [currentTime, duration]);

  // Sort checkpoints by timestamp
  const sortedCheckpoints = useMemo(() => {
    return [...checkpoints].sort((a, b) => a.timestamp - b.timestamp);
  }, [checkpoints]);

  // Handle click on the progress bar itself (seek)
  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration <= 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const seekTime = percent * duration;
    onSeek(seekTime);
  };

  if (duration <= 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Progress bar background */}
      <div 
        className={styles.progressBar}
        onClick={handleBarClick}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
      >
        {/* Current progress */}
        <div 
          className={styles.currentProgress}
          style={{ width: `${progressPercent}%` }}
        />
        
        {/* Checkpoint markers */}
        {sortedCheckpoints.map((checkpoint) => {
          const position = (checkpoint.timestamp / duration) * 100;
          const isUpcoming = checkpoint.timestamp > currentTime;
          const isPassed = checkpoint.timestamp <= currentTime;
          
          return (
            <div
              key={checkpoint.id}
              className={`
                ${styles.marker}
                ${checkpoint.completed ? styles.completed : styles.pending}
                ${isUpcoming ? styles.upcoming : ''}
                ${isPassed && !checkpoint.completed ? styles.passed : ''}
              `}
              style={{ left: `${position}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onCheckpointClick(checkpoint);
              }}
              title={checkpoint.title}
            >
              <div className={styles.markerDot}>
                <span className={styles.markerIcon}>
                  {getCheckpointIcon(checkpoint.type)}
                </span>
              </div>
              
              {/* Tooltip */}
              <div className={styles.tooltip}>
                <div className={styles.tooltipTitle}>{checkpoint.title}</div>
                <div className={styles.tooltipMeta}>
                  <span>{formatTime(checkpoint.timestamp)}</span>
                  {checkpoint.estimatedTime && (
                    <span>• {checkpoint.estimatedTime}</span>
                  )}
                </div>
                {checkpoint.completed && (
                  <div className={styles.tooltipStatus}>✓ Completed</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time display */}
      <div className={styles.timeDisplay}>
        <span className={styles.currentTimeText}>{formatTime(currentTime)}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.durationText}>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

export default CheckpointTimeline;
