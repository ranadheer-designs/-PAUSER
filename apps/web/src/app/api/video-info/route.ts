'use server';

import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: /api/video-info
 * 
 * Fetches video metadata from YouTube Data API.
 * Returns title, description, and thumbnail for a given video ID.
 */

interface VideoInfo {
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  duration?: string;
}

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  
  if (!videoId) {
    return NextResponse.json(
      { error: 'Missing videoId parameter' },
      { status: 400 }
    );
  }
  
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.warn('[VideoInfo] No YouTube API key configured');
    // Return fallback with video ID
    return NextResponse.json({
      title: `Video ${videoId}`,
      description: '',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle: '',
    });
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    
    if (!response.ok) {
      console.error(`[VideoInfo] YouTube API error: ${response.status}`);
      return NextResponse.json({
        title: `Video ${videoId}`,
        description: '',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channelTitle: '',
      });
    }
    
    const data = await response.json();
    const item = data.items?.[0];
    
    if (!item) {
      return NextResponse.json({
        title: `Video ${videoId}`,
        description: '',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channelTitle: '',
      });
    }
    
    const snippet = item.snippet;
    const videoInfo: VideoInfo = {
      title: snippet.title || `Video ${videoId}`,
      description: snippet.description || '',
      thumbnail: snippet.thumbnails?.maxres?.url 
        || snippet.thumbnails?.high?.url 
        || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle: snippet.channelTitle || '',
      duration: item.contentDetails?.duration,
    };
    
    return NextResponse.json(videoInfo);
    
  } catch (error) {
    console.error('[VideoInfo] Error fetching video info:', error);
    return NextResponse.json({
      title: `Video ${videoId}`,
      description: '',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle: '',
    });
  }
}
