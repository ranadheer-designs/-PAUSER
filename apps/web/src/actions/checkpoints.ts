'use server';

import { robustExtractTranscript } from '@/services/robustTranscriptExtractor';
import { analyzeTranscript } from '@/services/intelligentTranscriptAnalyzer';
import { findPracticeOpportunities, createPracticeCheckpoint } from '@pauser/common';

// ============================================================================
// TYPES
// ============================================================================

export interface SnapshotContent {
  type: 'snapshot';
  prompt: string;
  context: string;
}

export interface PracticeResourceContent {
  type: 'practice_resource';
  platform: 'leetcode' | 'hackerrank' | 'codewars';
  problemId: string;
  title: string;
  url: string;
  difficulty: 'easy' | 'medium' | 'hard';
  matchConfidence: number;
  matchReason: string;
}

export interface CodePracticeContent {
  type: 'code_practice';
  language: string;
  starterCode: string;
  testCases: Array<{ input: unknown; expected: unknown; description?: string }>;
  hints: string[];
  solution: string;
  problem: string;
}

// Legacy types for compatibility
interface PredictionContent { type: 'prediction'; prompt: string; context: string; revealTimestamp: number; }
interface ExplanationContent { type: 'explanation'; prompt: string; conceptName: string; targetAudience: 'junior' | 'past_self' | 'friend'; }
interface OneSentenceRuleContent { type: 'one_sentence_rule'; conceptName: string; requiredKeyword: string; maxWords: number; }

export interface ConceptQuizContent {
  type: 'concept_quiz';
  question: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  explanation: string;
}

export type CheckpointContent = SnapshotContent | PredictionContent | ExplanationContent | OneSentenceRuleContent | PracticeResourceContent | CodePracticeContent | ConceptQuizContent;

export interface GeneratedCheckpoint {
  id: string;
  timestamp: number;
  type: 'snapshot' | 'prediction' | 'explanation' | 'one_sentence_rule' | 'practice_resource' | 'code_practice' | 'concept_quiz';
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

// ============================================================================
// CHECKPOINT GENERATION
// ============================================================================

export async function generateCheckpoints(
  options: GenerateCheckpointsOptions
): Promise<GeneratedCheckpoint[]> {
  const { videoId, videoTitle, videoDuration, videoDescription } = options;
  
  console.log(`[Checkpoint] Generating checkpoints for: "${videoTitle}"`);
  
  try {
    // 1. Extract Transcript (Robust Method)
    const extractionResult = await robustExtractTranscript(videoId);
    
    // We consider it a valid transcript if we have > 5 segments
    if (!extractionResult.segments || extractionResult.segments.length < 5) {
      console.log('[Checkpoint] No valid transcript available - using fallback');
      const reason = extractionResult.error ? `ERR: ${extractionResult.error.substring(0, 15)}` : 'ERR: No Script';
      return generateFallbackCheckpoints(videoDuration, videoTitle, reason);
    }
    
    const transcriptSegments = extractionResult.segments;
    
    // 2. Intelligent Analysis
    console.log('[Checkpoint] Analyzing transcript...');
    
    // Check for API Keys before analysis
    if (!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        console.warn('[Checkpoint] No AI API Keys configured');
        return generateFallbackCheckpoints(videoDuration, videoTitle, 'ERR: No API Keys');
    }
    
    const analysis = await analyzeTranscript(transcriptSegments, videoDuration);
    
    // 3. Convert Analysis to Checkpoints
    const checkpoints: GeneratedCheckpoint[] = [];
    
    // Process Checkpoint Suggestions from LLM
    if (analysis.checkpointSuggestions) {
       analysis.checkpointSuggestions.forEach((suggestion, index) => {
          let content: CheckpointContent;
          
          if (suggestion.type === 'practice') {
              // Try to find a real practice resource for this suggestion
              const matches = findPracticeOpportunities(suggestion.reason || suggestion.suggestedPrompt, { maxResults: 1 });
              if (matches.length > 0) {
                  const match = matches[0];
                   content = {
                      type: 'practice_resource',
                      platform: match.resource.platform,
                      problemId: match.resource.problemId,
                      title: match.resource.title,
                      url: match.resource.url,
                      difficulty: match.resource.difficulty,
                      matchConfidence: 0.9,
                      matchReason: suggestion.reason
                  };
              } else {
                  // Fallback to snapshot if no resource found
                   content = {
                      type: 'snapshot',
                      prompt: suggestion.suggestedPrompt,
                      context: suggestion.reason
                   }; 
              }
          } else if (suggestion.type === 'code_practice' && suggestion.codePractice) {
              content = {
                  type: 'code_practice',
                  language: suggestion.codePractice.language,
                  starterCode: suggestion.codePractice.starterCode,
                  testCases: suggestion.codePractice.testCases,
                  hints: suggestion.codePractice.hints,
                  solution: suggestion.codePractice.solution,
                  problem: suggestion.suggestedPrompt
              };
          } else {
              // Quiz/Reflection mapped to Snapshot for now (simplifying V2)
              content = {
                  type: 'snapshot',
                  prompt: suggestion.suggestedPrompt,
                  context: suggestion.reason
              };
          }
          
          checkpoints.push({
              id: `cp-${index}-${Date.now()}`,
              timestamp: suggestion.timestamp,
              type: content.type === 'practice_resource' ? 'practice_resource' : content.type === 'code_practice' ? 'code_practice' : 'snapshot',
              title: content.type === 'practice_resource' ? 'Practice Challenge' : content.type === 'code_practice' ? 'Coding Practice' : 'Understanding Checkpoint',
              completed: false,
              content
          });
       });
    }
    
    // If LLM returned no suggestions, fallback to simple distribution based on segments
    if (checkpoints.length === 0) {
        console.log('[Checkpoint] LLM returned no suggestions, generating from segments...');
        // (Simplified fallback using natural breaks if available)
        const breakpoints = analysis.naturalBreakPoints || [];
        breakpoints.forEach((bt, idx) => {
             // Ensure break points are within reasonable bounds (10% to 90% of video)
             if (bt > videoDuration * 0.1 && bt < videoDuration * 0.9) {
                 checkpoints.push({
                     id: `cp-auto-${idx}`,
                     timestamp: bt,
                     type: 'snapshot',
                     title: 'Reflection Point (Auto)',
                     completed: false,
                     content: {
                         type: 'snapshot',
                         prompt: 'Take a moment to summarize the key concepts from this section.',
                         context: 'Natural learning break'
                     }
                 });
             }
        });
    }
    
    // If absolutely nothing, time-based fallback
    if (checkpoints.length === 0) {
        return generateFallbackCheckpoints(videoDuration, videoTitle, 'ERR: Analysis Empty');
    }
    
    // Sort
    checkpoints.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`[Checkpoint] Generated ${checkpoints.length} checkpoints.`);
    return checkpoints;

  } catch (error) {
    console.error('[Checkpoint] Generation error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    return generateFallbackCheckpoints(videoDuration, videoTitle, `ERR: ${msg.substring(0, 15)}`);
  }
}


/**
 * Generate fallback checkpoints when reliable transcript processing fails.
 */
function generateFallbackCheckpoints(duration: number, title: string, debugReason: string = ''): GeneratedCheckpoint[] {
  console.log('[Checkpoint] Using fallback generation (time-based)', debugReason);
  
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
      title: `Understanding Snapshot${debugReason ? ` (${debugReason})` : ''}`,
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
