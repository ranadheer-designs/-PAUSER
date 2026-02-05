'use client';

/**
 * YouTube Video Player Component
 * 
 * Uses the official YouTube IFrame Player API.
 * Implements PlayerController interface for consistent control.
 * 
 * TOS COMPLIANCE:
 * ================
 * This component uses YouTube's official IFrame API, which YouTube
 * explicitly provides for embedding videos on external sites.
 * 
 * We do NOT:
 * - Download or cache video content
 * - Block or remove ads (ads play normally through the iframe)
 * - Access raw video streams or audio
 * - Modify YouTube's native player UI
 * - Circumvent any content protection
 * 
 * We DO:
 * - Use the official player API for playback control
 * - Track time for our learning checkpoint system
 * - Pause/resume via official API methods
 * 
 * Seek prevention is purely UX-level (our own UI), not
 * a modification of YouTube's player behavior.
 */

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { PlayerController, PlayerState } from '@/lib/player/PlayerController';
import styles from './VideoPlayer.module.css';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

export interface VideoPlayerHandle extends PlayerController {}

interface VideoPlayerProps {
  videoId: string;
  onTimeUpdate?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onReady?: (duration: number) => void;
  seekToTime?: number;
  autoplay?: boolean;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer(
    {
      videoId,
      onTimeUpdate,
      onPlay,
      onPause,
      onReady,
      seekToTime,
      autoplay = false,
    },
    ref
  ) {
    const playerRef = useRef<YTPlayer | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
    const lastSeekTo = useRef<number | undefined>(undefined);
    const isReadyRef = useRef(false);
    
    // Callback refs for subscriptions
    const timeUpdateCallbacks = useRef<Set<(time: number) => void>>(new Set());
    const stateChangeCallbacks = useRef<Set<(state: PlayerState) => void>>(new Set());

    // Load YouTube IFrame API
    useEffect(() => {
      if (typeof window.YT !== 'undefined') {
        initPlayer();
        return;
      }

      // Load the API script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initPlayer;

      return () => {
        window.onYouTubeIframeAPIReady = undefined;
      };
    }, []);

    // Initialize player
    const initPlayer = useCallback(() => {
      if (!containerRef.current || playerRef.current) return;

      playerRef.current = new window.YT.Player('youtube-player', {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 1, // Keep YouTube controls (TOS compliant)
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            isReadyRef.current = true;
            const duration = event.target.getDuration();
            onReady?.(duration);
          },
          onStateChange: (event) => {
            const state = event.data as PlayerState;
            
            // Notify state change callbacks
            stateChangeCallbacks.current.forEach(cb => cb(state));
            
            if (event.data === window.YT.PlayerState.PLAYING) {
              onPlay?.();
              startTimeTracking();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              onPause?.();
              stopTimeTracking();
            }
          },
        },
      });
    }, [videoId, onReady, onPlay, onPause, autoplay]);

    // Time tracking
    const startTimeTracking = useCallback(() => {
      if (timeUpdateInterval.current) return;

      timeUpdateInterval.current = setInterval(() => {
        if (playerRef.current && isReadyRef.current) {
          const time = playerRef.current.getCurrentTime();
          onTimeUpdate?.(time);
          
          // Notify time update callbacks
          timeUpdateCallbacks.current.forEach(cb => cb(time));
        }
      }, 250); // Update 4 times per second
    }, [onTimeUpdate]);

    const stopTimeTracking = useCallback(() => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
        timeUpdateInterval.current = null;
      }
    }, []);

    // Handle external seek requests
    useEffect(() => {
      if (seekToTime !== undefined && seekToTime !== lastSeekTo.current) {
        lastSeekTo.current = seekToTime;
        if (playerRef.current && isReadyRef.current) {
          playerRef.current.seekTo(seekToTime, true);
        }
      }
    }, [seekToTime]);

    // Cleanup
    useEffect(() => {
      return () => {
        stopTimeTracking();
        playerRef.current?.destroy();
      };
    }, [stopTimeTracking]);

    // Expose PlayerController interface via ref
    useImperativeHandle(ref, () => ({
      getCurrentTime: () => {
        if (!playerRef.current || !isReadyRef.current) return 0;
        return playerRef.current.getCurrentTime();
      },
      
      seekTo: async (seconds: number) => {
        if (!playerRef.current || !isReadyRef.current) {
          throw new Error('Player not ready');
        }
        playerRef.current.seekTo(seconds, true);
      },
      
      pause: async () => {
        if (!playerRef.current || !isReadyRef.current) {
          throw new Error('Player not ready');
        }
        playerRef.current.pauseVideo();
      },
      
      play: async () => {
        if (!playerRef.current || !isReadyRef.current) {
          throw new Error('Player not ready');
        }
        playerRef.current.playVideo();
      },
      
      isReady: () => isReadyRef.current,
      
      getDuration: () => {
        if (!playerRef.current || !isReadyRef.current) return 0;
        return playerRef.current.getDuration();
      },
      
      onTimeUpdate: (callback: (time: number) => void) => {
        timeUpdateCallbacks.current.add(callback);
        return () => {
          timeUpdateCallbacks.current.delete(callback);
        };
      },
      
      onStateChange: (callback: (state: PlayerState) => void) => {
        stateChangeCallbacks.current.add(callback);
        return () => {
          stateChangeCallbacks.current.delete(callback);
        };
      },
    }));

    return (
      <div className={styles.playerContainer} ref={containerRef}>
        <div id="youtube-player" className={styles.player} />
      </div>
    );
  }
);
