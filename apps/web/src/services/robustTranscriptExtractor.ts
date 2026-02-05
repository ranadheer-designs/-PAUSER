import { YoutubeTranscript } from 'youtube-transcript';
import { getSubtitles } from 'youtube-captions-scraper';
import { getVideoDetails } from 'youtube-caption-extractor';
import { spawn } from 'child_process';
import path from 'path';
import * as fs from 'fs';

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface ExtractionResult {
  segments: TranscriptSegment[];
  method: 'youtube-transcript' | 'youtube-captions-scraper' | 'youtubei.js' | 'youtube-caption-extractor' | 'fallback' | 'failed';
  language?: string;
  error?: string;
}

/**
 * Robustly extracts transcript from a YouTube video using multiple methods.
 */
export async function robustExtractTranscript(videoId: string): Promise<ExtractionResult> {
  console.log(`[TranscriptExtractor] Starting extraction for video: ${videoId}`);
  
  // Method 1: youtube-transcript (Lightweight, reliable for public videos with captions)
  try {
    console.log(`[TranscriptExtractor] Method 1: Trying youtube-transcript...`);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (transcript && transcript.length > 0) {
      console.log(`[TranscriptExtractor] Method 1 Success: ${transcript.length} segments found.`);
      return {
        segments: transcript.map((item: any) => ({
          start: item.offset / 1000, // Convert to seconds
          duration: item.duration / 1000,
          text: item.text
        })),
        method: 'youtube-transcript'
      };
    } else {
        console.warn(`[TranscriptExtractor] Method 1: Returned empty transcript.`);
    }
  } catch (error) {
    // console.error to allow debugging, but safe to continue
    console.warn(`[TranscriptExtractor] Method 1 failed:`, error instanceof Error ? error.message : error);
  }

  // Method 2: youtube-caption-extractor (Handles bot detection well)
  try {
    console.log(`[TranscriptExtractor] Method 2: Trying youtube-caption-extractor...`);
    const videoDetails = await getVideoDetails({ videoID: videoId, lang: 'en' });
    
    if (videoDetails && videoDetails.subtitles && videoDetails.subtitles.length > 0) {
       console.log(`[TranscriptExtractor] Method 2 Success: ${videoDetails.subtitles.length} segments found.`);
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
    console.warn(`[TranscriptExtractor] Method 2 failed:`, error instanceof Error ? error.message : error);
  }

  // Method 3: youtube-captions-scraper (Another scraper alternative)
  try {
    console.log(`[TranscriptExtractor] Method 3: Trying youtube-captions-scraper...`);
    const captions = await getSubtitles({ videoID: videoId, lang: 'en' });
    
    if (captions && captions.length > 0) {
       console.log(`[TranscriptExtractor] Method 3 Success: ${captions.length} segments found.`);
       return {
         segments: captions.map((item: any) => ({
           start: parseFloat(item.start),
           duration: parseFloat(item.dur),
           text: item.text
         })),
         method: 'youtube-captions-scraper'
       };
    }
  } catch (error) {
    console.warn(`[TranscriptExtractor] Method 3 failed:`, error instanceof Error ? error.message : error);
  }

  // Method 4: youtubei.js (Mimics Android/Web client)
  try {
    console.log(`[TranscriptExtractor] Method 4: Trying youtubei.js...`);
    const { Innertube } = await import('youtubei.js');
    const youtube = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false
    });

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
                console.log(`[TranscriptExtractor] Method 4 Success: ${segments.length} segments found.`);
                return {
                    segments,
                    method: 'youtubei.js'
                };
             }
        }
    } catch (innerError) {
         console.warn('[TranscriptExtractor] Method 4 (getTranscript) failed:', innerError);
    }
    
  } catch (error) {
    console.warn(`[TranscriptExtractor] Method 4 failed:`, error instanceof Error ? error.message : error);
  }

  // Method 5: Python Script (Ultimate Fallback with youtube-transcript-api)
  try {
    console.log(`[TranscriptExtractor] Method 5: Trying Python script (youtube-transcript-api)...`);
    
    // Resolve path to script
    let targetScript = path.resolve(process.cwd(), 'scripts/transcript.py'); // Default root
    if (!fs.existsSync(targetScript)) {
        // Try locating relative to this file if process.cwd() is weird
        // But mainly check the usual apps/web vs root locations
        targetScript = path.resolve(process.cwd(), '../../scripts/transcript.py'); 
    }
    
    if (fs.existsSync(targetScript)) {
        console.log(`[TranscriptExtractor] Found python script at: ${targetScript}`);
        
        const pythonResult = await new Promise<any>((resolve, reject) => {
            // Try 'python' or 'python3' or 'py'
            // We assume 'python' is in path and setup
            const pyProcess = spawn('python', [targetScript, videoId]);
            let dataString = '';
            let errorString = '';

            pyProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            pyProcess.stderr.on('data', (data) => {
                errorString += data.toString();
            });

            pyProcess.on('error', (err) => {
                reject(new Error(`Failed to spawn python: ${err.message}`));
            });

            pyProcess.on('close', (code) => {
                if (code !== 0) {
                    try {
                        const err = JSON.parse(dataString); // Sometimes python prints json error to stdout
                        reject(new Error(err.error || errorString));
                    } catch {
                        reject(new Error(`Python script exited with code ${code}: ${errorString}`));
                    }
                } else {
                    try {
                        resolve(JSON.parse(dataString));
                    } catch (e) {
                       reject(new Error('Failed to parse Python output JSON'));
                    }
                }
            });
        });

        if (pythonResult.success && pythonResult.segments.length > 0) {
             console.log(`[TranscriptExtractor] Method 5 Success: ${pythonResult.segments.length} segments found.`);
             return {
                 segments: pythonResult.segments.map((s: any) => ({
                     start: s.offset / 1000,
                     duration: s.duration / 1000,
                     text: s.text
                 })),
                 method: 'fallback' // Python method
             };
        } else {
             console.warn(`[TranscriptExtractor] Method 5 failed logic:`, pythonResult.error);
        }
    } else {
        console.warn(`[TranscriptExtractor] Method 5 skipped: Python script not found at expected paths. CWD: ${process.cwd()}`);
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
