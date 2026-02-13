from http.server import BaseHTTPRequestHandler
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
)
import json
from urllib.parse import parse_qs, urlparse

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        # Parse query parameters
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        video_id = query_params.get('videoId', [None])[0]

        if not video_id:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False, 
                "error": "Missing videoId parameter"
            }).encode('utf-8'))
            return

        result = self.fetch_transcript(video_id)
        
        status_code = 200 if result['success'] else 500
        # If it's a known error like "VideoUnavailable", maybe 404 or 400 is better, but 500 is safe for now.
        
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        # Add CORS headers if necessary, or let Vercel handle it
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))

    def fetch_transcript(self, video_id):
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            transcript = None
            try:
                transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
            except NoTranscriptFound:
                try:
                    transcript = transcript_list.find_generated_transcript(['en', 'en-US', 'en-GB'])
                except NoTranscriptFound:
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
            
            data = transcript.fetch()
            
            segments = []
            for item in data:
                text = item.get('text', '')
                start = item.get('start', 0)
                duration = item.get('duration', 0)
                
                segments.append({
                    "text": text,
                    "offset": int(start * 1000), 
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
