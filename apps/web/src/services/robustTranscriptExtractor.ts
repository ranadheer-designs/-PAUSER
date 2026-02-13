import { YoutubeTranscript } from 'youtube-transcript';
import { getSubtitles } from 'youtube-captions-scraper';
import { getVideoDetails } from 'youtube-caption-extractor';


export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface ExtractionResult {
  segments: TranscriptSegment[];
  method: 'direct-fetch' | 'youtube-transcript' | 'youtube-captions-scraper' | 'youtubei.js' | 'youtube-caption-extractor' | 'fallback' | 'failed';
  language?: string;
  error?: string;
}

/**
 * Robustly extracts transcript from a YouTube video using multiple methods.
 */
export async function robustExtractTranscript(videoId: string): Promise<ExtractionResult> {
  console.log(`[TranscriptExtractor] Starting extraction for video: ${videoId}`);
  
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  // Method 1: youtubei.js with Client Rotation
  // We try different clients (WEB, ANDROID) as they have different rate limits/blocking rules
  const clients = ['WEB', 'ANDROID'];
  
  for (const clientType of clients) {
    try {
      console.log(`[TranscriptExtractor] Method 1 (${clientType}): Trying youtubei.js...`);
      const { Innertube, UniversalCache } = await import('youtubei.js');
      
      const youtube = await Innertube.create({
        lang: 'en',
        location: 'US',
        retrieve_player: false,
        cache: new UniversalCache(false),
        generate_session_locally: true,
        device_category: 'desktop' // Default, acts as generic
      });

      // For ANDROID, we might need to cast or configure differently if using setup, 
      // but Innertube.create handles basic client selection internally if we could pass it,
      // actually Innertube defaults to WEB. To force ANDROID we'd pass client_type if supported 
      // or just rely on its internal defaulting. 
      // NOTE: youtubei.js latest versions handle clients differently. 
      // We will try standard first.
      
      const info = await youtube.getInfo(videoId);
      
      try {
          const transcriptData = await info.getTranscript();
      
          if (transcriptData && transcriptData.transcript?.content?.body?.initial_segments) {
               const segments: TranscriptSegment[] = transcriptData.transcript.content.body.initial_segments.map((seg: any) => {
                  const start = parseInt(seg.start_ms || '0') / 1000;
                  const end = parseInt(seg.end_ms || '0') / 1000;
                  const text = seg.snippet?.text || '';
                  return {
                      start,
                      duration: Math.max(0, end - start),
                      text
                  };
              });

               if (segments.length > 0) {
                  console.log(`[TranscriptExtractor] Method 1 (${clientType}) Success: ${segments.length} segments found.`);
                  return {
                      segments,
                      method: 'youtubei.js'
                  };
                  // Implicit break by returning
               }
          }
      } catch (innerError) {
           console.warn(`[TranscriptExtractor] Method 1 (${clientType}) getTranscript failed:`, innerError);
      }
      
    } catch (error) {
      console.warn(`[TranscriptExtractor] Method 1 (${clientType}) failed:`, error instanceof Error ? error.message : error);
    }
  }

  // Method 2: youtube-transcript (Lightweight, often works if not blocked)
  try {
    console.log(`[TranscriptExtractor] Method 2: Trying youtube-transcript...`);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en'
    });
    
    if (transcript && transcript.length > 0) {
      console.log(`[TranscriptExtractor] Method 2 Success: ${transcript.length} segments found.`);
      return {
        segments: transcript.map((item: any) => ({
          start: item.offset / 1000, 
          duration: item.duration / 1000,
          text: item.text
        })),
        method: 'youtube-transcript'
      };
    }
  } catch (error) {
    console.warn(`[TranscriptExtractor] Method 2 failed:`, error instanceof Error ? error.message : error);
  }

  // Method 3: youtube-caption-extractor
  try {
    console.log(`[TranscriptExtractor] Method 3: Trying youtube-caption-extractor...`);
    const videoDetails = await getVideoDetails({ videoID: videoId, lang: 'en' });
    
    if (videoDetails && videoDetails.subtitles && videoDetails.subtitles.length > 0) {
       console.log(`[TranscriptExtractor] Method 3 Success: ${videoDetails.subtitles.length} segments found.`);
       return {
         segments: videoDetails.subtitles.map((item: any) => ({
           start: parseFloat(item.start),
           duration: parseFloat(item.dur),
           text: item.text
         })),
         method: 'youtube-caption-extractor'
       };
    }
  } catch (error) {
    console.warn(`[TranscriptExtractor] Method 3 failed:`, error instanceof Error ? error.message : error);
  }

  // Method 4: Direct Fetch with Enhanced Headers (Last Resort)
  try {
    console.log(`[TranscriptExtractor] Method 4: Trying direct fetch strategy...`);
    const directResult = await fetchTranscriptDirectly(videoId);
    
    if (directResult && directResult.length > 0) {
      console.log(`[TranscriptExtractor] Method 4 Success: ${directResult.length} segments found.`);
      return {
        segments: directResult,
        method: 'direct-fetch'
      };
    }
  } catch (error) {
    console.warn(`[TranscriptExtractor] Method 4 failed:`, error instanceof Error ? error.message : error);
  }

  // Method 5: Python Serverless Function (Vercel)
  // This replaces the local spawn method to work in production
  try {
    console.log(`[TranscriptExtractor] Method 5: Trying Vercel Python API...`);
    
    // Construct absolute URL if on server side, or relative if on client
    // In Vercel serverless environment or local dev
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isProduction ? 'https://pauser.vercel.app' : 'http://localhost:3000');
    const apiUrl = `${baseUrl}/api/transcript?videoId=${videoId}`;
    
    console.log(`[TranscriptExtractor] Fetching from: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (response.ok) {
        const data = await response.json();
        if (data.success && data.segments && data.segments.length > 0) {
             console.log(`[TranscriptExtractor] Method 5 Success: ${data.segments.length} segments found.`);
             return {
                 segments: data.segments.map((s: any) => ({
                     start: s.offset / 1000,
                     duration: s.duration / 1000,
                     text: s.text
                 })),
                 method: 'fallback' // Keeping 'fallback' or we could name it 'api-python'
             };
        } else {
             console.warn(`[TranscriptExtractor] Method 5 response error:`, data.error);
        }
    } else {
         console.warn(`[TranscriptExtractor] Method 5 HTTP error: ${response.status} ${response.statusText}`);
         const text = await response.text();
         console.warn(`[TranscriptExtractor] Response body:`, text);
    }
    
  } catch (error) {
     console.warn(`[TranscriptExtractor] Method 5 failed:`, error instanceof Error ? error.message : error);
  }

  // Failure
  console.error(`[TranscriptExtractor] All methods failed for video ${videoId}`);
  return {
    segments: [],
    method: 'failed',
    error: 'Could not extract transcript using any available method.'
  };
}

/**
 * Direct fetch strategy
 * Fetches the video page HTML and scrapes the caption track URL from ytInitialPlayerResponse
 */

export async function fetchTranscriptDirectly(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    // 1. Fetch Video Page
    console.log(`[TranscriptExtractor] DirectFetch: Fetching page for ${videoId}...`);
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video page: ${response.status}`);
    }

    const html = await response.text();
    console.log(`[TranscriptExtractor] DirectFetch: Page fetched, length: ${html.length}`);

    // Capture cookies to forward them (critical for 'ei' param validation)
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
        console.log('[TranscriptExtractor] DirectFetch: Captured session cookies.');
    }

    // 2. Extract Captions URL
    // Look for "captionTracks" inside ytInitialPlayerResponse
    const captionsMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);
    if (!captionsMatch) {
      console.warn('[TranscriptExtractor] DirectFetch: "captionTracks" not found in HTML.');
      // Try alternative: playerCaptionsTracklistRenderer
      if (html.includes('playerCaptionsTracklistRenderer')) {
         console.log('[TranscriptExtractor] Found playerCaptionsTracklistRenderer but regex failed. Structure might be different.');
      }
      return null;
    }

    // Find the English track or the first available one
    // The match[1] contains the JSON array content
    const tracksJson = `[${captionsMatch[1]}]`;
    let tracks: any[] = [];
    try {
      tracks = JSON.parse(tracksJson);
      console.log(`[TranscriptExtractor] DirectFetch: Parsed ${tracks.length} tracks.`);
    } catch (e) {
      console.warn('[TranscriptExtractor] Failed to parse caption tracks JSON');
      return null;
    }

    // Priorities: English (en), Auto-generated English (a.en), First available
    const englishTrack = tracks.find((t: any) => t.languageCode === 'en' && !t.kind); // Manual English
    const autoEnglishTrack = tracks.find((t: any) => t.languageCode === 'en' && t.kind === 'asr'); // Auto-gen English
    
    const bestTrack = englishTrack || autoEnglishTrack || tracks[0];

    if (!bestTrack || !bestTrack.baseUrl) {
      console.warn('[TranscriptExtractor] DirectFetch: No suitable track found.');
      return null;
    }

    const captionsUrl = bestTrack.baseUrl;
    console.log(`[TranscriptExtractor] DirectFetch: Found caption track: ${bestTrack.name?.simpleText || 'Unknown'} (${bestTrack.languageCode})`);
    console.log(`[TranscriptExtractor] DirectFetch: URL: ${captionsUrl.substring(0, 100)}...`);

    // 3. Fetch XML Captions
    const headers: Record<string, string> = {
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://www.youtube.com/watch?v=${videoId}`,
    };
    if (cookies) {
        headers['Cookie'] = cookies;
    }

    const captionsResponse = await fetch(captionsUrl, { headers });
    
    if (!captionsResponse.ok) {
      throw new Error(`Failed to fetch captions XML: ${captionsResponse.status} ${captionsResponse.statusText}`);
    }

    console.log(`[TranscriptExtractor] DirectFetch: Response Status: ${captionsResponse.status} ${captionsResponse.statusText}`);
    const headersObj: Record<string, string> = {};
    captionsResponse.headers.forEach((val, key) => { headersObj[key] = val; });
    // console.log(`[TranscriptExtractor] DirectFetch: Response Headers: ${JSON.stringify(headersObj)}`);

    const xml = await captionsResponse.text();
    console.log(`[TranscriptExtractor] DirectFetch: XML fetched, length: ${xml.length}`);

    if (xml.length < 500) {
        console.log(`[TranscriptExtractor] DirectFetch: XML Snippet: ${xml}`);
    } else {
        console.log(`[TranscriptExtractor] DirectFetch: XML Start: ${xml.substring(0, 250)}`);
    }

    // 4. Parse XML (Flexible Regex)
    const segments: TranscriptSegment[] = [];
    
    // Match all <text ...>...</text> tags first
    const textBlockRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
    
    let blockMatch;
    while ((blockMatch = textBlockRegex.exec(xml)) !== null) {
        const attributes = blockMatch[1];
        const textContent = blockMatch[2];
        
        let start = 0;
        let duration = 0;
        
        const startMatch = attributes.match(/start="([\d.]+)"/);
        if (startMatch) start = parseFloat(startMatch[1]);
        
        const durMatch = attributes.match(/dur="([\d.]+)"/);
        if (durMatch) duration = parseFloat(durMatch[1]);
        
        if (startMatch) { // Duration might be optional in some formats
            const text = decodeHTMLEntities(textContent);

            if (text.trim().length > 0) {
                segments.push({
                    start,
                    duration,
                    text
                });
            }
        }
    }
    
    console.log(`[TranscriptExtractor] DirectFetch: Extracted ${segments.length} segments.`);
    return segments;

  } catch (error) {
    console.error('[TranscriptExtractor] Direct fetch error:', error);
    return null;
  }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

