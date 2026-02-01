'use server';

/**
 * Understanding Snapshots & Practice Checkpoints Generation
 * 
 * Generates:
 * 1. "Understanding Snapshots" - moments for the user to pause and reflect
 * 2. "Practice Checkpoints" - LeetCode/HackerRank problems for hands-on learning
 * 
 * CORE PHILOSOPHY:
 * Instead of quizzes or challenges, we ask: "Pause. Write what you understand so far."
 * When coding content is detected, we suggest relevant practice problems.
 * 
 * V2 ENHANCEMENTS:
 * - Full transcript analysis before checkpoint generation
 * - Content-type gating (no checkpoints for entertainment/vlogs)
 * - Concept window-based post-explanation checkpoint placement
 */

import path from 'path';
import fs from 'fs';
import { 
  findPracticeOpportunities, 
  createPracticeCheckpoint,
} from '@pauser/common';

// ============================================================================
// TYPES
// ============================================================================

/** Concept window from video analysis - represents a concept with its timestamp range */
interface ConceptWindow {
  name: string;
  startTimestamp: number;
  endTimestamp: number;
  depth: 'introduction' | 'explanation' | 'deep_dive';
}

/** Problem mention from video analysis */
interface MentionedProblem {
  name: string;
  platform: string;
  timestamp: number;
  confidence: number;
}

/** Understanding Snapshot content */
interface SnapshotContent {
  type: 'snapshot';
  prompt: string;
  context: string; // The context of what was just discussed
}

/** Practice Resource content (LeetCode, HackerRank, etc.) */
interface PracticeResourceContent {
  type: 'practice_resource';
  platform: 'leetcode' | 'hackerrank' | 'codewars';
  problemId: string;
  title: string;
  url: string;
  difficulty: 'easy' | 'medium' | 'hard';
  matchConfidence: number;
  matchReason: string;
}

// Keeping these for type compatibility but we won't generate them
interface PredictionContent { type: 'prediction'; prompt: string; context: string; revealTimestamp: number; }
interface ExplanationContent { type: 'explanation'; prompt: string; conceptName: string; targetAudience: 'junior' | 'past_self' | 'friend'; }
interface OneSentenceRuleContent { type: 'one_sentence_rule'; conceptName: string; requiredKeyword: string; maxWords: number; }

type CheckpointContent = SnapshotContent | PredictionContent | ExplanationContent | OneSentenceRuleContent | PracticeResourceContent;

export interface GeneratedCheckpoint {
  id: string;
  timestamp: number;
  type: 'snapshot' | 'prediction' | 'explanation' | 'one_sentence_rule' | 'practice_resource';
  title: string;
  completed: boolean;
  content: CheckpointContent;
}

interface GenerateCheckpointsOptions {
  videoId: string;
  videoTitle: string;
  videoDuration: number;
  videoDescription?: string;
}

interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Filter promotional content from text
 */
function filterPromotionalContent(text: string): string {
  let filtered = text
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/follow\s+\w+\s+on/gi, '')
    .replace(/subscribe\s+to/gi, '')
    .replace(/like\s+and\s+subscribe/gi, '')
    .replace(/\#\w+/g, '')
    .replace(/@\w+/g, '')
    .replace(/all\s+rights\s+reserved/gi, '')
    .replace(/copyright\s+\d+/gi, '');
  
  return filtered.replace(/\s+/g, ' ').trim();
}

/**
 * Identify major topic shifts or key concept completions in the transcript.
 * Returns a list of segments that represent good stopping points.
 */
function identifyReflectionPoints(
  segments: TranscriptSegment[], 
  duration: number, 
  title: string
): Array<{ timestamp: number; context: string; topic: string }> {
  // Simple heuristic: Spread checkpoints evenly, but try to align with sentence ends
  // In a real implementation with LLM, we would analyze the semantic structure.
  // For now, we'll aim for every 5-7 minutes or logical breaks.

  const points: Array<{ timestamp: number; context: string; topic: string }> = [];
  
  // Target interval: ~3-5 minutes (180-300 seconds) depending on length
  const targetInterval = Math.max(180, Math.min(300, duration / 5));
  const numCheckpoints = Math.floor(duration / targetInterval);
  
  if (numCheckpoints === 0) return points;

  // Extract a few keywords from title for "topic" fallback
  const titleKeywords = title.split(' ').filter(w => w.length > 4).slice(0, 3).join(' ');

  for (let i = 1; i <= numCheckpoints; i++) {
    const targetTime = i * targetInterval;
    
    // Find segment close to targetTime
    const segmentIndex = segments.findIndex(s => s.offset / 1000 >= targetTime);
    
    if (segmentIndex !== -1) {
      // Look for a period or pause in the surrounding segments to find a natural break
      let bestIndex = segmentIndex;
      
      // Look ahead/behind 5 segments for a sentence ending
      for (let j = Math.max(0, segmentIndex - 5); j < Math.min(segments.length, segmentIndex + 5); j++) {
        const text = segments[j].text.trim();
        if (text.endsWith('.') || text.endsWith('?') || text.endsWith('!')) {
          bestIndex = j;
          break; // Found a sentence end
        }
      }

      const segment = segments[bestIndex];
      const timestamp = Math.floor((segment.offset + segment.duration) / 1000); // End of segment
      
      // Get some context context (previous 30s of text)
      const contextStart = Math.max(0, bestIndex - 10);
      const contextText = segments.slice(contextStart, bestIndex + 1)
        .map(s => s.text)
        .join(' ');
        
      points.push({
        timestamp,
        context: contextText.slice(-200), // Last 200 chars as immediate context
        topic: titleKeywords || "this section",
      });
    }
  }

  return points;
}

// ============================================================================
// TRANSCRIPT FETCHING
// ============================================================================

/**
 * Fetch transcript using Python youtube-transcript-api script.
 */
async function fetchTranscriptWithPython(videoId: string): Promise<TranscriptSegment[]> {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    
    const possiblePaths = [
      path.join(process.cwd(), 'scripts', 'transcript.py'),
      path.join(process.cwd(), '..', '..', 'scripts', 'transcript.py'),
      path.join(__dirname, '..', '..', '..', '..', 'scripts', 'transcript.py'),
      path.join(process.cwd(), '..', 'scripts', 'transcript.py')
    ];

    let scriptPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        scriptPath = p;
        break;
      }
    }
    
    if (!scriptPath) {
      const absoluteFallback = path.join('c:\\Users\\shobh\\Downloads\\Pauser\\scripts\\transcript.py');
      if (fs.existsSync(absoluteFallback)) {
        scriptPath = absoluteFallback;
      } else {
        resolve([]);
        return;
      }
    }

    console.log(`[Checkpoint] Running Python script: ${scriptPath}`);
    
    const pythonProcess = spawn('py', [scriptPath, videoId], {
      timeout: 30000,
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code: number) => {
      if (code === 0 && stdout) {
        try {
          const result = JSON.parse(stdout);
          if (result.success && result.segments && result.segments.length > 0) {
            console.log(`[Checkpoint] ✓ Python script returned ${result.segments.length} segments`);
            resolve(result.segments);
            return;
          }
        } catch (parseError) {
          console.log('[Checkpoint] Python script: Failed to parse JSON output');
        }
      }
      resolve([]);
    });
    
    pythonProcess.on('error', (error: Error) => {
      console.log(`[Checkpoint] Python script error: ${error.message}`);
      resolve([]);
    });
  });
}

/**
 * Fetch transcript using youtubei.js library.
 */
async function fetchTranscriptWithYoutubei(videoId: string): Promise<TranscriptSegment[]> {
  try {
    console.log('[Checkpoint] Trying youtubei.js...');
    const { Innertube } = await import('youtubei.js');
    
    const youtube = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false,
    });
    
    const info = await youtube.getInfo(videoId);
    const transcriptInfo = await info.getTranscript();
    
    if (transcriptInfo && transcriptInfo.transcript && transcriptInfo.transcript.content) {
      const body = transcriptInfo.transcript.content.body;
      if (body && body.initial_segments) {
        const segments: TranscriptSegment[] = body.initial_segments
          .filter((seg: { snippet?: { text?: string } }) => seg.snippet?.text)
          .map((seg: { start_ms?: string; end_ms?: string; snippet?: { text?: string } }) => ({
            text: filterPromotionalContent(seg.snippet?.text || ''),
            offset: parseInt(seg.start_ms || '0', 10),
            duration: parseInt(seg.end_ms || '0', 10) - parseInt(seg.start_ms || '0', 10),
          }))
          .filter((s: TranscriptSegment) => s.text.length > 2);
        
        if (segments.length > 10) {
          console.log(`[Checkpoint] ✓ Got ${segments.length} transcript segments from youtubei.js`);
          return segments;
        }
      }
    }
  } catch (error) {
    console.log('[Checkpoint] youtubei.js failed:', error instanceof Error ? error.message : 'Unknown error');
  }
  return [];
}

/**
 * Fetch transcript using multiple methods with fallbacks.
 */
async function fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
  console.log(`[Checkpoint] Fetching transcript for: ${videoId}`);
  
  const pythonSegments = await fetchTranscriptWithPython(videoId);
  if (pythonSegments.length > 10) {
    return pythonSegments;
  }
  
  const youtubeiSegments = await fetchTranscriptWithYoutubei(videoId);
  if (youtubeiSegments.length > 10) {
    return youtubeiSegments;
  }
  
  console.log('[Checkpoint] ✗ No transcript available');
  return [];
}

// ============================================================================
// CHECKPOINT GENERATION
// ============================================================================

/**
 * Generate Understanding Snapshots and Practice Checkpoints.
 * 
 * V2 Enhanced:
 * 1. Analyzes full transcript FIRST to determine if checkpoints should be generated
 * 2. Gates on content type (no checkpoints for entertainment/vlogs)
 * 3. Uses concept windows for post-explanation checkpoint placement
 * 4. Creates checkpoints only for genuine educational content
 */
export async function generateCheckpoints(
  options: GenerateCheckpointsOptions
): Promise<GeneratedCheckpoint[]> {
  const { videoId, videoTitle, videoDuration, videoDescription } = options;
  
  console.log(`[Checkpoint] Generating checkpoints for: "${videoTitle}"`);
  
  try {
    // Fetch transcript
    const transcriptSegments = await fetchTranscript(videoId);
    const hasTranscript = transcriptSegments.length > 10;
    
    if (!hasTranscript) {
      console.log('[Checkpoint] No transcript available - using fallback');
      return generateFallbackCheckpoints(videoDuration, videoTitle);
    }
    
    // Combine all transcript text for analysis
    const fullTranscriptText = transcriptSegments.map(s => s.text).join(' ');
    
    // ========================================================================
    // STEP 1: Full Video Analysis with Content Gating
    // ========================================================================
    console.log('[Checkpoint] Analyzing full video content...');
    
    // Create AI service for video analysis
    const { AIService } = await import('@pauser/common');
    const aiService = new AIService({
      enabled: true,
      model: 'google/gemini-2.0-flash-exp:free',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      geminiApiKey: process.env.GEMINI_API_KEY,
    });
    
    const videoAnalysis = await aiService.analyzeVideoContent({
      title: videoTitle,
      transcript: fullTranscriptText,
    });
    
    console.log(`[Checkpoint] Content type: ${videoAnalysis.contentType}, Generate: ${videoAnalysis.shouldGenerateCheckpoints}`);
    
    // ========================================================================
    // STEP 2: Gate on Content Type (Moderate Gating)
    // ========================================================================
    if (!videoAnalysis.shouldGenerateCheckpoints) {
      console.log(`[Checkpoint] Skipping checkpoints: ${videoAnalysis.skipReason || 'Non-educational content'}`);
      return []; // No checkpoints for entertainment/vlogs
    }
    
    const checkpoints: GeneratedCheckpoint[] = [];
    
    // ========================================================================
    // STEP 3: Practice Checkpoints from Concept Windows (Post-Explanation)
    // ========================================================================
    
    // First, check for explicitly mentioned problems in the analysis
    if (videoAnalysis.mentionedProblems && videoAnalysis.mentionedProblems.length > 0) {
      console.log(`[Checkpoint] Found ${videoAnalysis.mentionedProblems.length} explicitly mentioned problems`);
      
      for (const problem of videoAnalysis.mentionedProblems) {
        // Try to match with our curated list
        const practiceMatches = findPracticeOpportunities(problem.name, {
          maxResults: 1,
          minConfidence: 0.7,
          contentType: videoAnalysis.contentType,
        });
        
        if (practiceMatches.length > 0) {
          // Place checkpoint AFTER the problem is explained (post-explanation)
          // Use concept window endTimestamp if available, otherwise add 60s to mention time
          const conceptWindow = (videoAnalysis.conceptWindows ?? []).find(
            (cw: ConceptWindow) => cw.name.toLowerCase().includes(problem.name.toLowerCase())
          );
          const timestamp = conceptWindow 
            ? Math.min(conceptWindow.endTimestamp, videoDuration - 30)
            : Math.min(problem.timestamp + 60, videoDuration - 30);
          
          const practiceCheckpoint = createPracticeCheckpoint(practiceMatches[0], timestamp);
          checkpoints.push({
            id: `practice-mentioned-${checkpoints.length}-${Date.now()}`,
            timestamp: practiceCheckpoint.timestamp,
            type: 'practice_resource',
            title: practiceCheckpoint.title,
            completed: false,
            content: practiceCheckpoint.content as PracticeResourceContent,
          });
        }
      }
    }
    
    // Then, match concepts from concept windows to practice problems
    if (videoAnalysis.conceptWindows && videoAnalysis.conceptWindows.length > 0) {
      console.log(`[Checkpoint] Analyzing ${videoAnalysis.conceptWindows.length} concept windows`);
      
      for (const conceptWindow of videoAnalysis.conceptWindows) {
        // Skip if we already have a checkpoint close to this window's end
        const hasNearbyCheckpoint = checkpoints.some(
          cp => Math.abs(cp.timestamp - conceptWindow.endTimestamp) < 45
        );
        if (hasNearbyCheckpoint) continue;
        
        // Try to find practice problems matching this concept
        const practiceMatches = findPracticeOpportunities(conceptWindow.name, {
          maxResults: 1,
          minConfidence: 0.7,
          contentType: videoAnalysis.contentType,
        });
        
        if (practiceMatches.length > 0) {
          // Place at END of concept window (post-explanation timing)
          const timestamp = Math.min(conceptWindow.endTimestamp, videoDuration - 30);
          const practiceCheckpoint = createPracticeCheckpoint(practiceMatches[0], timestamp);
          
          checkpoints.push({
            id: `practice-concept-${checkpoints.length}-${Date.now()}`,
            timestamp: practiceCheckpoint.timestamp,
            type: 'practice_resource',
            title: practiceCheckpoint.title,
            completed: false,
            content: practiceCheckpoint.content as PracticeResourceContent,
          });
        }
      }
    }
    
    // ========================================================================
    // STEP 4: Fallback to keyword matching if no concept windows
    // ========================================================================
    if (checkpoints.filter(c => c.type === 'practice_resource').length === 0) {
      // Fallback to original keyword-based matching
      const practiceMatches = findPracticeOpportunities(fullTranscriptText, {
        maxResults: 3,
        minConfidence: 0.7,
        contentType: videoAnalysis.contentType,
      });
      
      console.log(`[Checkpoint] Fallback: Found ${practiceMatches.length} practice opportunities from transcript`);
      
      if (practiceMatches.length > 0) {
        const practiceWindow = videoDuration * 0.7;
        const practiceInterval = practiceWindow / (practiceMatches.length + 1);
        
        practiceMatches.forEach((match, index) => {
          const timestamp = Math.floor((index + 1) * practiceInterval);
          const practiceCheckpoint = createPracticeCheckpoint(match, timestamp);
          
          checkpoints.push({
            id: `practice-${index}-${Date.now()}`,
            timestamp: practiceCheckpoint.timestamp,
            type: 'practice_resource',
            title: practiceCheckpoint.title,
            completed: false,
            content: practiceCheckpoint.content as PracticeResourceContent,
          });
        });
      }
    }
    
    // ========================================================================
    // STEP 5: Understanding Snapshots at Concept Boundaries
    // ========================================================================
    
    // Limit practice checkpoints to max 3
    const practiceCheckpoints = checkpoints.filter(c => c.type === 'practice_resource').slice(0, 3);
    checkpoints.length = 0;
    checkpoints.push(...practiceCheckpoints);
    
    // Create snapshots at concept window endings (if no practice checkpoint there)
    if (videoAnalysis.conceptWindows && videoAnalysis.conceptWindows.length > 0) {
      const practiceTimestamps = checkpoints.map(cp => cp.timestamp);
      
      for (const conceptWindow of videoAnalysis.conceptWindows) {
        // Skip if there's already a checkpoint nearby
        const hasNearby = practiceTimestamps.some(pt => Math.abs(pt - conceptWindow.endTimestamp) < 60);
        if (hasNearby) continue;
        
        // Only add snapshots for explanation or deep_dive concepts
        if (conceptWindow.depth === 'introduction') continue;
        
        const timestamp = Math.min(conceptWindow.endTimestamp, videoDuration - 30);
        checkpoints.push({
          id: `snap-${checkpoints.length}-${Date.now()}`,
          timestamp,
          type: 'snapshot',
          title: 'Understanding Snapshot',
          completed: false,
          content: {
            type: 'snapshot',
            prompt: `Pause. Write what you understand about "${conceptWindow.name}".`,
            context: conceptWindow.name,
          },
        });
      }
    } else {
      // Fallback: use reflection point identification
      const reflectionPoints = identifyReflectionPoints(transcriptSegments, videoDuration, videoTitle);
      const practiceTimestamps = checkpoints.map(cp => cp.timestamp);
      const filteredReflectionPoints = reflectionPoints.filter(point => {
        return !practiceTimestamps.some(pt => Math.abs(pt - point.timestamp) < 60);
      });
      
      filteredReflectionPoints.forEach((point, index) => {
        checkpoints.push({
          id: `snap-${index}-${Date.now()}`,
          timestamp: point.timestamp,
          type: 'snapshot',
          title: 'Understanding Snapshot',
          completed: false,
          content: {
            type: 'snapshot',
            prompt: "Reflect on what you've learned so far.",
            context: point.context,
          },
        });
      });
    }
    
    // Sort checkpoints by timestamp
    checkpoints.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`[Checkpoint] Generated ${checkpoints.length} total checkpoints (${checkpoints.filter(c => c.type === 'practice_resource').length} practice, ${checkpoints.filter(c => c.type === 'snapshot').length} snapshots)`);
    return checkpoints;
    
  } catch (error) {
    console.error('[Checkpoint] Generation error:', error);
    return generateFallbackCheckpoints(videoDuration, videoTitle);
  }
}

/**
 * Generate fallback checkpoints when reliable transcript processing fails.
 */
function generateFallbackCheckpoints(duration: number, title: string): GeneratedCheckpoint[] {
  console.log('[Checkpoint] Using fallback generation (time-based)');
  
  const checkpoints: GeneratedCheckpoint[] = [];
  // For long videos (over 10m), every 5 mins. For short, just one in middle.
  const interval = duration > 600 ? 300 : Math.floor(duration / 2);
  const numCheckpoints = Math.floor(duration / interval);
  
  for (let i = 1; i <= numCheckpoints; i++) {
    const timestamp = i * interval;
    if (timestamp >= duration - 30) continue; // Don't put one right at the end
    
    checkpoints.push({
      id: `fallback-snap-${i}-${Date.now()}`,
      timestamp,
      type: 'snapshot',
      title: 'Understanding Snapshot',
      completed: false,
      content: {
        type: 'snapshot',
        prompt: "Pause. Write what you understand so far.",
        context: `Section ${i} of ${title}`,
      },
    });
  }
  
  return checkpoints;
}
