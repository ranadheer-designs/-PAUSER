'use client';

/**
 * SmartVideoPlayer Component
 * 
 * A checkpoint-aware video player wrapper that:
 * - Monitors playback time
 * - Triggers checkpoints at appropriate moments
 * - Displays timeline with checkpoint markers
 * - Integrates with SmartSidebar
 * - Exposes VideoPlayer handle via ref
 */

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { VideoPlayer, VideoPlayerHandle } from './VideoPlayer';

import styles from './SmartVideoPlayer.module.css';
import { PlayerState } from '@/lib/player/PlayerController';

interface Checkpoint {
  id: string;
  timestamp: number;
  title: string;
  type: string;
  completed: boolean;
  estimatedTime?: string;
  content?: unknown;
}

interface SmartVideoPlayerProps {
  videoId: string;
  checkpoints: Checkpoint[];
  onCheckpointTriggered: (checkpoint: Checkpoint) => void;
  onCheckpointComplete: (checkpointId: string) => void;
  onTimeUpdate?: (time: number) => void;
  onReady?: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  seekToTime?: number;
  sidebarOpen?: boolean;
}

export const SmartVideoPlayer = forwardRef<VideoPlayerHandle, SmartVideoPlayerProps>(
  function SmartVideoPlayer({
    videoId,
    checkpoints,
    onCheckpointTriggered,
    onCheckpointComplete,
    onTimeUpdate,
    onReady,
    onPlay,
    onPause,
    seekToTime,
    sidebarOpen = true,
  }, ref) {
    const playerRef = useRef<VideoPlayerHandle>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null);
    const lastTriggeredCheckpoint = useRef<string | null>(null);
    
    // Track which checkpoints have been triggered this session
    const triggeredThisSession = useRef<Set<string>>(new Set());

    // Expose VideoPlayer methods via ref
    useImperativeHandle(ref, () => ({
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      seekTo: (seconds) => playerRef.current?.seekTo(seconds) ?? Promise.resolve(),
      pause: () => playerRef.current?.pause() ?? Promise.resolve(),
      play: () => playerRef.current?.play() ?? Promise.resolve(),
      isReady: () => playerRef.current?.isReady() ?? false,
      getDuration: () => playerRef.current?.getDuration() ?? 0,
      onTimeUpdate: (cb) => playerRef.current?.onTimeUpdate(cb) ?? (() => {}),
      onStateChange: (cb) => playerRef.current?.onStateChange(cb) ?? (() => {}),
    }));

    // Handle time updates
    const handleTimeUpdate = useCallback((time: number) => {
      setCurrentTime(time);
      onTimeUpdate?.(time);

      // Check if we've reached a checkpoint that hasn't been triggered
      if (isPlaying && !activeCheckpoint) {
        const nextCheckpoint = checkpoints.find(cp => {
          // Skip if already completed or triggered this session
          if (cp.completed || triggeredThisSession.current.has(cp.id)) return false;
          
          // Check if we're within the trigger window (0.5 seconds before to 2 seconds after)
          const timeDiff = time - cp.timestamp;
          return timeDiff >= -0.5 && timeDiff <= 2;
        });

        if (nextCheckpoint && nextCheckpoint.id !== lastTriggeredCheckpoint.current) {
          triggerCheckpoint(nextCheckpoint);
        }
      }
    }, [checkpoints, isPlaying, activeCheckpoint, onTimeUpdate]);

    // Trigger a checkpoint
    const triggerCheckpoint = useCallback((checkpoint: Checkpoint) => {
      // Pause video
      playerRef.current?.pause();
      
      // Mark as triggered
      lastTriggeredCheckpoint.current = checkpoint.id;
      triggeredThisSession.current.add(checkpoint.id);
      setActiveCheckpoint(checkpoint);
      
      // Notify parent
      onCheckpointTriggered(checkpoint);
      
      console.log(`[SmartVideoPlayer] Triggered checkpoint: ${checkpoint.title}`);
    }, [onCheckpointTriggered]);



    // Handle play
    const handlePlay = useCallback(() => {
      setIsPlaying(true);
      setActiveCheckpoint(null);
      onPlay?.();
    }, [onPlay]);

    // Handle pause
    const handlePause = useCallback(() => {
      setIsPlaying(false);
      onPause?.();
    }, [onPause]);

    // Handle player ready
    const handleReady = useCallback((videoDuration: number) => {
      setDuration(videoDuration);
      onReady?.(videoDuration);
    }, [onReady]);

    // Resume playback after checkpoint completion
    const resumePlayback = useCallback(() => {
      setActiveCheckpoint(null);
      playerRef.current?.play();
    }, []);

    // Skip checkpoint
    const skipCheckpoint = useCallback(() => {
      setActiveCheckpoint(null);
      playerRef.current?.play();
    }, []);

    // Complete active checkpoint
    useEffect(() => {
      if (activeCheckpoint && checkpoints.find(cp => cp.id === activeCheckpoint.id)?.completed) {
        // Checkpoint was completed, resume playback
        resumePlayback();
      }
    }, [checkpoints, activeCheckpoint, resumePlayback]);

    return (
      <div className={`${styles.container} ${sidebarOpen ? styles.withSidebar : ''}`}>
        {/* Video Player */}
        <div className={styles.playerWrapper}>
          <VideoPlayer
            ref={playerRef}
            videoId={videoId}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onReady={handleReady}
            seekToTime={seekToTime}
            autoplay={false}
          />
        </div>



        {/* Checkpoint notification badge */}
        {activeCheckpoint && (
          <div className={styles.checkpointNotification}>
            <div className={styles.notificationContent}>
              <span className={styles.notificationIcon}>⏸️</span>
              <span className={styles.notificationText}>
                Checkpoint: {activeCheckpoint.title}
              </span>
              <button 
                className={styles.skipButton}
                onClick={skipCheckpoint}
              >
                Skip →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default SmartVideoPlayer;
