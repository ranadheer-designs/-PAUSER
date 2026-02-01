#!/usr/bin/env python3
"""
YouTube Transcript Fetcher
Uses youtube-transcript-api (https://github.com/jdepoix/youtube-transcript-api)
Returns JSON output for Node.js consumption
"""

import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
)


def fetch_transcript(video_id: str) -> dict:
    """
    Fetch transcript for a YouTube video.
    Returns dict with 'success', 'segments' or 'error'.
    """
    try:
        # Create API instance (required in v1.x)
        ytt_api = YouTubeTranscriptApi()
        
        # Try to get transcript - prefers manual captions, falls back to auto-generated
        transcript_list = ytt_api.list(video_id)
        
        # Try to find English transcript first
        transcript = None
        try:
            transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
        except NoTranscriptFound:
            # Fall back to auto-generated
            try:
                transcript = transcript_list.find_generated_transcript(['en', 'en-US', 'en-GB'])
            except NoTranscriptFound:
                # Get any available transcript and translate to English
                for t in transcript_list:
                    if t.is_translatable:
                        transcript = t.translate('en')
                        break
        
        if transcript is None:
            return {
                "success": False,
                "error": "No English transcript available",
                "segments": []
            }
        
        # Fetch the actual transcript data
        data = transcript.fetch()
        
        # Format segments - handle both FetchedTranscript object and list
        segments = []
        for item in data:
            # Handle FetchedTranscriptSnippet objects (v1.x) or dict (older versions)
            if hasattr(item, 'text'):
                text = item.text
                start = item.start
                duration = item.duration
            else:
                text = item.get('text', '')
                start = item.get('start', 0)
                duration = item.get('duration', 0)
            
            segments.append({
                "text": text,
                "offset": int(start * 1000),  # Convert to milliseconds
                "duration": int(duration * 1000)
            })
        
        return {
            "success": True,
            "segments": segments,
            "language": transcript.language_code,
            "isGenerated": transcript.is_generated
        }
        
    except TranscriptsDisabled:
        return {
            "success": False,
            "error": "Transcripts are disabled for this video",
            "segments": []
        }
    except VideoUnavailable:
        return {
            "success": False,
            "error": "Video is unavailable",
            "segments": []
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "segments": []
        }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "No video ID provided",
            "segments": []
        }))
        sys.exit(1)
    
    video_id = sys.argv[1]
    result = fetch_transcript(video_id)
    print(json.dumps(result))
    
    if result["success"]:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
