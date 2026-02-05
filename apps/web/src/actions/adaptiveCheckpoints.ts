'use server';

/**
 * Adaptive Checkpoint Generation Action
 * 
 * Phase 2: Context-aware, AI-powered checkpoint generation using Claude/Gemini.
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
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!openRouterKey && !geminiKey) {
    console.warn('[AdaptiveCheckpoints] No AI API keys configured');
    return null;
  }

  return new AIService({
    enabled: true,
    model: 'google/gemini-2.0-flash-exp:free',
    apiKey: openRouterKey || '',
    baseUrl: 'https://openrouter.ai/api/v1',
    geminiApiKey: geminiKey,
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

  // Create AI service
  const aiService = createAIService();
  if (!aiService) {
    return {
      success: false,
      checkpoints: [],
      metadata: null,
      error: 'AI service not configured',
    };
  }

  try {
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
  } catch (error) {
    console.error('[AdaptiveCheckpoints] Error generating checkpoints:', error);
    return {
      success: false,
      checkpoints: [],
      metadata: null,
      error: error instanceof Error ? error.message : 'Unknown error',
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
