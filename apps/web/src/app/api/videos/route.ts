/**
 * POST /api/videos - Submit new video for processing
 * 
 * Accepts a YouTube URL, extracts metadata, fetches transcript,
 * and triggers checkpoint generation asynchronously.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateCheckpoints } from '@/actions/checkpoints';
import { getOrCreateVideoId, saveCheckpoints } from '@/actions/checkpointActions';

interface VideoSubmitRequest {
  youtubeUrl: string;
  userId?: string;
}

interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  channelName: string;
}

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch video metadata from YouTube
 */
async function fetchVideoInfo(videoId: string): Promise<VideoInfo | null> {
  try {
    // Try oEmbed first (no API key required)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      return {
        id: videoId,
        title: data.title || 'Untitled Video',
        description: '',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: 0, // oEmbed doesn't provide duration
        channelName: data.author_name || 'Unknown Channel',
      };
    }
    
    // Fallback to youtubei.js for more details
    const { Innertube } = await import('youtubei.js');
    const youtube = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false,
    });
    
    const info = await youtube.getInfo(videoId);
    const basicInfo = info.basic_info;
    
    return {
      id: videoId,
      title: basicInfo.title || 'Untitled Video',
      description: basicInfo.short_description || '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: basicInfo.duration || 0,
      channelName: basicInfo.author || 'Unknown Channel',
    };
  } catch (error) {
    console.error('[API/videos] Failed to fetch video info:', error);
    return null;
  }
}

/**
 * Process video in background (simulated async)
 * This function returns immediately and processes in the background.
 */
async function processVideoInBackground(
  videoId: string,
  videoInfo: VideoInfo
): Promise<void> {
  try {
    console.log(`[API/videos] Background processing started for ${videoId}`);
    
    // Generate checkpoints
    const checkpoints = await generateCheckpoints({
      videoId,
      videoTitle: videoInfo.title,
      videoDuration: videoInfo.duration,
      videoDescription: videoInfo.description,
    });
    
    // Save checkpoints to database
    if (checkpoints.length > 0) {
      await saveCheckpoints(videoId, checkpoints, {
        title: videoInfo.title,
        description: videoInfo.description,
        thumbnailUrl: videoInfo.thumbnailUrl,
      });
      console.log(`[API/videos] Saved ${checkpoints.length} checkpoints for ${videoId}`);
    } else {
      console.log(`[API/videos] No checkpoints generated for ${videoId}`);
    }
    
    // Update video record with processing complete status
    const supabase = createClient();
    await (supabase
      .from('videos') as any)
      .update({
        transcript_analysis: {
          status: 'complete',
          checkpointCount: checkpoints.length,
          processedAt: new Date().toISOString(),
        },
      })
      .eq('youtube_id', videoId);
      
    console.log(`[API/videos] Background processing complete for ${videoId}`);
  } catch (error) {
    console.error(`[API/videos] Background processing failed for ${videoId}:`, error);
    
    // Update status to failed
    const supabase = createClient();
    await (supabase
      .from('videos') as any)
      .update({
        transcript_analysis: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
        },
      })
      .eq('youtube_id', videoId);
  }
}

export async function POST(req: Request) {
  try {
    const body: VideoSubmitRequest = await req.json();
    const { youtubeUrl } = body;
    
    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'youtubeUrl is required' },
        { status: 400 }
      );
    }
    
    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }
    
    // Fetch video metadata
    const videoInfo = await fetchVideoInfo(videoId);
    if (!videoInfo) {
      return NextResponse.json(
        { error: 'Failed to fetch video information' },
        { status: 404 }
      );
    }
    
    // Create or get video record
    const dbVideoId = await getOrCreateVideoId(videoId, {
      title: videoInfo.title,
      description: videoInfo.description,
      thumbnailUrl: videoInfo.thumbnailUrl,
    });
    
    // Update video with duration info
    const supabase = createClient();
    await (supabase
      .from('videos') as any)
      .update({
        duration: videoInfo.duration,
        channel_name: videoInfo.channelName,
        transcript_analysis: {
          status: 'processing',
          startedAt: new Date().toISOString(),
        },
      })
      .eq('id', dbVideoId);
    
    // Start background processing (don't await)
    processVideoInBackground(videoId, videoInfo).catch(console.error);
    
    // Return immediately with processing status
    return NextResponse.json({
      videoId,
      dbVideoId,
      status: 'processing',
      title: videoInfo.title,
      thumbnailUrl: videoInfo.thumbnailUrl,
      message: 'Video submitted for processing. Checkpoints will be generated shortly.',
    });
    
  } catch (error) {
    console.error('[API/videos] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/videos - List all videos with checkpoints
 */
export async function GET() {
  try {
    const supabase = createClient();
    
    const { data: videos, error } = await supabase
      .from('videos')
      .select(`
        id,
        youtube_id,
        title,
        duration,
        channel_name,
        transcript_analysis,
        created_at,
        checkpoints(count)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('[API/videos] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      );
    }
    
    const formattedVideos = (videos || []).map((video: any) => ({
      id: video.id,
      youtubeId: video.youtube_id,
      title: video.title,
      duration: video.duration,
      channelName: video.channel_name,
      thumbnailUrl: `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`,
      checkpointCount: video.checkpoints?.[0]?.count || 0,
      status: video.transcript_analysis?.status || 'unknown',
      createdAt: video.created_at,
    }));
    
    return NextResponse.json({ videos: formattedVideos });
    
  } catch (error) {
    console.error('[API/videos] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
