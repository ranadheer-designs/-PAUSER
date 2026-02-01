/**
 * Time Formatting Utilities
 * 
 * Formats timestamps for display in notes UI.
 */

/**
 * Format seconds to MM:SS or HH:MM:SS format.
 * 
 * Examples:
 * - 45 → "0:45"
 * - 125 → "2:05"
 * - 3665 → "1:01:05"
 */
export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse timestamp string (MM:SS or HH:MM:SS) to seconds.
 * 
 * Examples:
 * - "0:45" → 45
 * - "2:05" → 125
 * - "1:01:05" → 3665
 */
export function parseTimestamp(timestamp: string): number | null {
  if (!timestamp) return null;
  
  const parts = timestamp.split(':').map(p => parseInt(p, 10));
  
  if (parts.some(p => isNaN(p) || p < 0)) {
    return null;
  }
  
  if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  return null;
}

/**
 * Format relative time (e.g., "2 hours ago", "just now").
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  
  if (diffSeconds < 60) {
    return 'just now';
  }
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  }
  
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}
