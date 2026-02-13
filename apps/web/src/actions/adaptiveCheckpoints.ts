/* eslint-disable @typescript-eslint/await-thenable */
'use server';

/**
 * Adaptive Checkpoint Generation Action
 * 
 * Phase 2: Context-aware, AI-powered checkpoint generation using Groq/OpenRouter.
 * Generates intelligent checkpoints that:
 * 1. Appear at perfect timing (natural break points)
 * 2. Match user's skill level
 * 3. Include embedded experiences (code editors, quizzes)
 */

import { AIService, type GenerateAdaptiveCheckpointsInput, type AdaptiveCheckpointGenerationResult, type UserLearningContext } from '@pauser/common';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateAdaptiveCheckpointsOptions {
  videoId: string;
  videoTitle: string;
  transcript: string;
  videoDuration: number;
  userId?: string;
  learningHistory?: UserLearningContext['learningHistory'];
  pastPerformance?: UserLearningContext['pastPerformance'];
}

export interface AdaptiveCheckpointResult {
  success: boolean;
  checkpoints: AdaptiveCheckpointGenerationResult['checkpoints'];
  metadata: AdaptiveCheckpointGenerationResult['analysisMetadata'] | null;
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create AI Service instance using environment variables
 */
function createAIService(): AIService | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!openRouterKey && !groqKey) {
    console.warn('[AdaptiveCheckpoints] No AI API keys configured');
    return null;
  }

  return new AIService({
    enabled: true,
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    apiKey: openRouterKey || '',
    baseUrl: 'https://openrouter.ai/api/v1',
    groqApiKey: groqKey,
  });
}

/**
 * Analyze transcript to extract segments and break points
 */
function analyzeTranscriptStructure(transcript: string, videoDuration: number) {
  // Simple analysis - in production would use more sophisticated NLP
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const segments: GenerateAdaptiveCheckpointsInput['transcriptAnalysis'] = {
    domain: 'general',
    detectedSkillLevel: 'intermediate',
    segments: [],
    naturalBreakPoints: [],
  };

  // Detect domain from content
  const lowerTranscript = transcript.toLowerCase();
  if (lowerTranscript.includes('function') || lowerTranscript.includes('code') || 
      lowerTranscript.includes('algorithm') || lowerTranscript.includes('programming')) {
    segments.domain = 'coding';
  } else if (lowerTranscript.includes('design') || lowerTranscript.includes('ui') || 
             lowerTranscript.includes('figma') || lowerTranscript.includes('color')) {
    segments.domain = 'design';
  }

  // Generate natural break points every 4-6 minutes
  const interval = Math.min(360, Math.max(240, videoDuration / 6));
  for (let t = interval; t < videoDuration - 60; t += interval) {
    segments.naturalBreakPoints.push(Math.floor(t));
  }

  // Create rough segments
  const segmentDuration = videoDuration / Math.max(3, sentences.length / 10);
  let currentTime = 0;
  for (let i = 0; i < Math.min(10, sentences.length); i += 3) {
    const endTime = Math.min(currentTime + segmentDuration, videoDuration);
    segments.segments.push({
      startTime: Math.floor(currentTime),
      endTime: Math.floor(endTime),
      type: 'explanation',
      topics: sentences.slice(i, i + 3).map(s => s.trim().slice(0, 50)),
    });
    currentTime = endTime;
  }

  return segments;
}

// ============================================================================
// MAIN ACTION
// ============================================================================

/**
 * Generate adaptive checkpoints for a video using AI analysis.
 * 
 * @param options - Video and user context for checkpoint generation
 * @returns Adaptive checkpoint result with checkpoints array
 */
/**
 * Generate adaptive checkpoints for a video using AI analysis.
 * 
 * @param options - Video and user context for checkpoint generation
 * @returns Adaptive checkpoint result with checkpoints array
 */
/**
 * Generate adaptive checkpoints for a video using AI analysis.
 * 
 * @param options - Video and user context for checkpoint generation
 * @returns Adaptive checkpoint result with checkpoints array
 */
export async function generateAdaptiveCheckpoints(
  options: GenerateAdaptiveCheckpointsOptions
): Promise<AdaptiveCheckpointResult> {
  const { videoId, videoTitle, transcript, videoDuration, userId, learningHistory, pastPerformance } = options;

  console.log(`[AdaptiveCheckpoints] Generating for video: "${videoTitle}" (${videoDuration}s)`);

  // Validate inputs
  if (!transcript || transcript.length < 100) {
    return {
      success: false,
      checkpoints: [],
      metadata: null,
      error: 'Transcript too short for checkpoint generation',
    };
  }

  try {
    // Check if Groq is available for V2 generation
    if (process.env.GROQ_API_KEY) {
      console.log('[AdaptiveCheckpoints] Using Groq V2 "Ultra-Refined" Generation System');
      const { generatePerfectCheckpoints } = await import('../services/checkpointGeneratorV2');
      
      const transcriptAnalysis = analyzeTranscriptStructure(transcript, videoDuration); // This returns segments
      
      // Map inputs to V2 expected format
      const v2Metadata = {
        title: videoTitle,
        duration: videoDuration,
        domain: transcriptAnalysis.domain,
        estimatedLevel: transcriptAnalysis.detectedSkillLevel
      };

      // Calculate partial user profile if available
      let averageScore = 0;
      if (pastPerformance) {
        const scores = Object.values(pastPerformance).map(p => p.completionRate);
        if (scores.length > 0) {
          averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        }
      }

      // Determine preferred difficulty from learning history if possible
      let preferredDifficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';
      if (learningHistory?.skillProgression) {
        // skillProgression values are 'novice' | 'intermediate' | 'advanced'
        // We map 'novice' to 'beginner'
        const levels = Object.values(learningHistory.skillProgression);
        if (levels.includes('advanced')) preferredDifficulty = 'advanced';
        else if (levels.includes('novice')) preferredDifficulty = 'beginner';
      }

      const v2UserProfile = userId ? {
        averageScore: averageScore,
        preferredDifficulty: preferredDifficulty,
        strugglingTopics: [] // Default to empty as we can't easily derive it from current types
      } : null;

      // Prepare transcript for V2 (needs text property)
      // The user's code handles array or string, but array of objects with 'text' is best.
      const v2Transcript = transcriptAnalysis.segments.map(s => ({
        start: s.startTime,
        text: s.topics.join('. ')
      }));

      // Call V2 Generator
      const v2Result = await generatePerfectCheckpoints(v2Transcript, v2Metadata, v2UserProfile as any);

      if (v2Result && v2Result.success) {
        console.log(`[AdaptiveCheckpoints] V2 System generated ${v2Result.checkpoints?.length} checkpoints`); // removed score access if stats is used

        
        // Map V2 checkpoints to our Schema format
        // The V2 prompt output puts `learningObjective` at top level, Schema expects it in `metadata`
        const mappedCheckpoints = v2Result.checkpoints.map((cp: any) => ({
            ...cp,
            type: cp.type === 'COMPREHENSION_QUIZ' ? 'CONCEPT_QUIZ' : cp.type,
            // Ensure priority is uppercase
            priority: cp.priority?.toUpperCase() || 'MEDIUM',
            // Schema expects metadata object
            metadata: {
                ...cp.metadata,
                learningObjective: cp.learningObjective || cp.metadata?.learningObjective || 'Objective'
            }
        }));

        return {
            success: true,
            checkpoints: mappedCheckpoints,
            metadata: {
                detectedDomain: ((v2Result as any).analysis?.domain || transcriptAnalysis.domain) as any, // Cast to enum
                subDomain: (v2Result as any).analysis?.subDomain,
                skillLevel: ((v2Result as any).analysis?.skillLevel || 'intermediate') as any,
                totalCheckpoints: v2Result.metrics?.checkpointCount || mappedCheckpoints.length,
                estimatedTotalPracticeTime: v2Result.metrics?.estimatedPracticeTime || '15 minutes', 
                aiConfidence: (v2Result.metrics?.qualityScore || 80) / 100
            }
        };
      } else {
        console.warn('[AdaptiveCheckpoints] V2 System failed or returned empty, falling back...');
      }
    }

    // Fallback to original logic (using AIService) if V2 failed or Groq key missing
    const aiService = createAIService();
    if (!aiService) {
      return {
        success: false,
        checkpoints: [],
        metadata: null,
        error: 'AI service not configured',
      };
    }

    // Analyze transcript structure
    const transcriptAnalysis = analyzeTranscriptStructure(transcript, videoDuration);

    // Build user context
    const userContext: UserLearningContext = {
      userId,
      learningHistory,
      pastPerformance,
      currentVideoProgress: 0,
    };

    // Generate adaptive checkpoints
    const input: GenerateAdaptiveCheckpointsInput = {
      videoId,
      videoTitle,
      transcript,
      transcriptAnalysis,
      userContext,
    };

    const result = await aiService.generateAdaptiveCheckpoints(input);

    if (!result || !result.checkpoints) {
      console.warn('[AdaptiveCheckpoints] AI returned no checkpoints');
      return {
        success: false,
        checkpoints: [],
        metadata: null,
        error: 'AI did not generate checkpoints',
      };
    }

    console.log(`[AdaptiveCheckpoints] Generated ${result.checkpoints.length} checkpoints`);

    return {
      success: true,
      checkpoints: result.checkpoints,
      metadata: result.analysisMetadata,
    };
  } catch (error: any) {
    console.error('[AdaptiveCheckpoints] Error generating checkpoints:', error);
    return {
      success: false,
      checkpoints: [],
      metadata: null,
      error: error.message || 'Unknown error',
    };
  }
}


/**
 * Convert adaptive checkpoints to the format expected by useDeepFocus hook
 */
export function convertToDeepFocusCheckpoints(
  adaptiveCheckpoints: AdaptiveCheckpointGenerationResult['checkpoints']
) {
  return adaptiveCheckpoints.map(cp => ({
    id: cp.id,
    timestamp: cp.timestamp,
    type: mapCheckpointType(cp.type),
    title: cp.title,
    completed: false,
    content: {
      type: mapCheckpointType(cp.type),
      ...cp.embeddedEditor && {
        language: cp.embeddedEditor.language,
        starterCode: cp.embeddedEditor.starterCode,
        testCases: cp.embeddedEditor.testCases,
        hints: cp.embeddedEditor.hints,
      },
      ...cp.quiz && {
        question: cp.quiz.question,
        options: cp.quiz.options,
        explanation: cp.quiz.explanation,
      },
      ...cp.reflectionPrompt && {
        prompt: cp.reflectionPrompt.question,
        context: cp.context,
      },
      estimatedTime: cp.estimatedTime,
      difficulty: cp.difficulty,
    },
  }));
}

/**
 * Map adaptive checkpoint type to existing checkpoint type
 */
function mapCheckpointType(type: string): string {
  switch (type) {
    case 'CODE_PRACTICE':
    case 'DEBUG_CHALLENGE':
      return 'code_practice';
    case 'CONCEPT_QUIZ':
      return 'concept_quiz';
    case 'REFLECTION':
      return 'snapshot';
    case 'KNOWLEDGE_CHECK':
      return 'knowledge_check';
    case 'DESIGN_PRACTICE':
      return 'design_practice';
    case 'CRITIQUE_CHALLENGE':
      return 'critique';
    default:
      return 'snapshot';
  }
}
