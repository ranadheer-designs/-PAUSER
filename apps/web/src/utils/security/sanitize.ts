/**
 * Content Sanitization Utilities
 * 
 * SECURITY DECISION:
 * We strip all HTML tags and encode special characters to prevent XSS attacks.
 * Markdown is supported via safe rendering (not raw HTML injection).
 * 
 * Note size is limited to 10KB to prevent abuse and ensure performance.
 */

const MAX_NOTE_SIZE = 10240; // 10KB in bytes

/**
 * Sanitize note content to prevent XSS attacks.
 * Strips HTML tags and limits content size.
 */
export function sanitizeNoteContent(content: string): string {
  if (!content) return '';
  
  // Remove HTML tags
  let sanitized = content.replace(/<[^>]*>/g, '');
  
  // Encode special HTML characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  // Limit size
  if (new Blob([sanitized]).size > MAX_NOTE_SIZE) {
    // Truncate to max size (approximate)
    sanitized = sanitized.substring(0, MAX_NOTE_SIZE);
  }
  
  return sanitized.trim();
}

/**
 * Validate note body before saving.
 * Returns error message if invalid, null if valid.
 */
export function validateNoteBody(body: string): string | null {
  if (!body || body.trim().length === 0) {
    return 'Note content cannot be empty';
  }
  
  if (new Blob([body]).size > MAX_NOTE_SIZE) {
    return `Note content exceeds maximum size of ${MAX_NOTE_SIZE / 1024}KB`;
  }
  
  return null;
}

/**
 * Validate timestamp values.
 */
export function validateTimestamp(seconds: number): string | null {
  if (seconds < 0) {
    return 'Timestamp cannot be negative';
  }
  
  if (!Number.isFinite(seconds)) {
    return 'Timestamp must be a valid number';
  }
  
  return null;
}
