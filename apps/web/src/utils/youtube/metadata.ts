/**
 * YouTube Video Metadata Fetcher
 * 
 * Fetches video title and thumbnail from YouTube using oEmbed API.
 * No API key required - uses YouTube's public oEmbed endpoint.
 */

export interface YouTubeVideoMetadata {
  title: string;
  thumbnailUrl: string;
  authorName?: string;
}

/**
 * Fetch video metadata from YouTube using oEmbed API.
 * This is a free, no-auth-required endpoint.
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeVideoMetadata | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`[YouTube] Failed to fetch metadata for ${videoId}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    
    return {
      title: data.title || `Video ${videoId}`,
      thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      authorName: data.author_name,
    };
  } catch (error) {
    console.error(`[YouTube] Error fetching metadata for ${videoId}:`, error);
    return null;
  }
}

/**
 * Get YouTube thumbnail URL for a video.
 * Falls back to different quality levels if higher ones aren't available.
 */
export function getYouTubeThumbnail(videoId: string, quality: 'maxres' | 'hq' | 'mq' | 'default' = 'hq'): string {
  const qualityMap = {
    maxres: 'maxresdefault',
    hq: 'hqdefault',
    mq: 'mqdefault',
    default: 'default',
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}
