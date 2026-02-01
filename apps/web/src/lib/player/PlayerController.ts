/**
 * Player Controller Interface
 * 
 * Abstract interface for video player control.
 * Enables consistent player interaction across different video sources.
 * 
 * DESIGN PHILOSOPHY:
 * - Deterministic: All methods return promises for async operations
 * - Safe: Guards against player-not-ready states
 * - Extensible: Easy to add support for other video platforms
 */

export enum PlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5,
}

export interface PlayerController {
  /**
   * Get current playback time in seconds.
   * Returns 0 if player is not ready.
   */
  getCurrentTime(): number;
  
  /**
   * Seek to a specific time in seconds.
   * Throws if timestamp is invalid.
   */
  seekTo(seconds: number): Promise<void>;
  
  /**
   * Pause the video.
   */
  pause(): Promise<void>;
  
  /**
   * Play the video.
   */
  play(): Promise<void>;
  
  /**
   * Check if player is ready for interaction.
   */
  isReady(): boolean;
  
  /**
   * Get video duration in seconds.
   * Returns 0 if player is not ready.
   */
  getDuration(): number;
  
  /**
   * Subscribe to time updates.
   * Returns unsubscribe function.
   */
  onTimeUpdate(callback: (time: number) => void): () => void;
  
  /**
   * Subscribe to state changes.
   * Returns unsubscribe function.
   */
  onStateChange(callback: (state: PlayerState) => void): () => void;
}

/**
 * Parse timestamp from URL query parameter.
 * Supports formats: ?t=123 or ?t=1m30s or ?t=1h2m3s
 */
export function parseUrlTimestamp(url: string): number | null {
  try {
    const urlObj = new URL(url);
    const t = urlObj.searchParams.get('t');
    
    if (!t) return null;
    
    // Try parsing as plain number (seconds)
    const asNumber = parseFloat(t);
    if (!isNaN(asNumber) && asNumber >= 0) {
      return asNumber;
    }
    
    // Try parsing as time format (1h2m3s, 1m30s, etc.)
    const hoursMatch = t.match(/(\d+)h/);
    const minutesMatch = t.match(/(\d+)m/);
    const secondsMatch = t.match(/(\d+)s/);
    
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  } catch {
    return null;
  }
}

/**
 * Validate timestamp value.
 */
export function isValidTimestamp(seconds: number, duration: number): boolean {
  return (
    Number.isFinite(seconds) &&
    seconds >= 0 &&
    seconds <= duration
  );
}
