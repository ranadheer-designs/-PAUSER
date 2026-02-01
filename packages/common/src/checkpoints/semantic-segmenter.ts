
import { AIService } from '../ai/service';
import { TeachingMomentsResult, TeachingMomentResult } from '../ai/types';
import { VideoSegment } from './types';

/**
 * Teaching Moment Detection
 * 
 * Uses AI to identify "teaching moments" within a stream of transcript segments.
 * 
 * Strategy:
 * 1. Accumulate segments into a context window (e.g. 30-60 seconds)
 * 2. Send to AI for classification
 * 3. Return identified moments with timestamps
 */
export class SemanticSegmenter {
  
  constructor(private aiService: AIService) {}

  /**
   * Process a list of segments and detect teaching moments.
   * Uses a sliding window approach? Or just processes distinct chunks?
   * For simplicity V1: Processes distinct chunks of ~60s.
   */
  async detectMoments(segments: VideoSegment[]): Promise<TeachingMomentResult[]> {
    const CHUNK_DURATION = 60; // seconds
    const moments: TeachingMomentResult[] = [];
    
    // Group segments into chunks
    const chunks = this.createChunks(segments, CHUNK_DURATION);

    for (const chunk of chunks) {
      const transcriptText = chunk.segments.map(s => s.transcriptChunk).join(' ');
      
      if (transcriptText.length < 50) continue; // Skip empty/short chunks

      const result = await this.aiService.detectTeachingMoments({
        transcriptChunk: transcriptText
      });

      // Adjust relative timestamps to absolute
      const absoluteMoments = result.moments.map(m => ({
        ...m,
        range: {
          start: chunk.startTime + m.range.start,
          end: chunk.startTime + m.range.end
        },
        transcript_text: m.transcript_text || transcriptText // Fallback
      }));

      moments.push(...absoluteMoments);
    }

    return moments;
  }

  private createChunks(segments: VideoSegment[], duration: number): { startTime: number, segments: VideoSegment[] }[] {
    const chunks: { startTime: number, segments: VideoSegment[] }[] = [];
    if (segments.length === 0) return chunks;

    let currentChunk: VideoSegment[] = [];
    let currentStartTime = segments[0].startTime;
    let currentDuration = 0;

    for (const segment of segments) {
      if (currentDuration + (segment.endTime - segment.startTime) > duration) {
        // Close chunk
        chunks.push({ startTime: currentStartTime, segments: currentChunk });
        // Start new
        currentChunk = [segment];
        currentStartTime = segment.startTime;
        currentDuration = segment.endTime - segment.startTime;
      } else {
        currentChunk.push(segment);
        currentDuration += (segment.endTime - segment.startTime);
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push({ startTime: currentStartTime, segments: currentChunk });
    }

    return chunks;
  }
}
