import Queue from 'bull';
import { AIService } from '@pauser/common';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase credentials. Database operations will fail.');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// Using Bull queue for async processing
export const videoProcessingQueue = new Queue('video-processing', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Initialize UI/AI services
const aiService = new AIService({
  enabled: true,
  model: 'meta-llama/llama-3.3-70b-instruct:free', // Default model
  apiKey: process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || '',
});

// Mock checkpoint generator (until moved to common)
const checkpointGenerator = {
  generate: async (analysis: any, context: any) => {
    console.log('[Worker] Generating checkpoints via stub...');
    // In a real implementation, this would call the logic currently in apps/web/src/actions/checkpoints.ts
    // For now, returning mock checkpoints
    return [
      {
        id: `mock-cp-${Date.now()}`,
        timestamp: 60,
        type: 'snapshot',
        title: 'Mock Snapshot',
        content: { type: 'snapshot', prompt: 'What specifically did you learn?' }
      },
      {
          id: `mock-practice-${Date.now()}`,
          timestamp: 120,
          type: 'practice_resource',
          title: 'Mock Practice',
          content: { type: 'practice_resource', problemId: 'two-sum', platform: 'leetcode' }
        }
    ];
  }
};

/**
 * Save checkpoints to database
 */
async function saveCheckpoints(videoId: string, checkpoints: any[]) {
    // 1. Get internal video ID from youtube_id
    const { data: video } = await supabase
        .from('videos')
        .select('id')
        .eq('youtube_id', videoId)
        .single();
    
    if (!video) {
        throw new Error(`Video not found: ${videoId}`);
    }
    const dbVideoId = video.id;

    // 2. Transform and insert
    const dbCheckpoints = checkpoints.map(cp => ({
        video_id: dbVideoId,
        timestamp: cp.timestamp,
        type: cp.type,
        title: cp.title,
        embedded_config: cp.content || {},
        metadata: {},
        ai_confidence: 0.9,
    }));

    const { error } = await supabase
        .from('checkpoints')
        .insert(dbCheckpoints);

    if (error) throw error;
}

/**
 * Update video processing status
 */
async function updateVideoStatus(videoId: string, status: string) {
    await supabase
        .from('videos')
        .update({
            transcript_analysis: {
                status: status,
                processedAt: new Date().toISOString()
            }
        })
        .eq('youtube_id', videoId);
}

// Process jobs
videoProcessingQueue.process('analyze-video', async (job) => {
  const { videoId, transcript, metadata } = job.data;
  console.log(`[Worker] Require processing for video: ${videoId}`);
  
  try {
    // Step 1: Analyze transcript
    job.progress(20);
    console.log('[Worker] Analyzing transcript...');
    
    // Use shared AIService if possible, or fallback
    // const analysis = await aiService.analyzeVideoContent({ title: metadata.title, transcript });
    // Mock analysis for now to ensure reliability without full env
    const analysis = {
        detectedSkillLevel: 'novice',
        summary: 'Mock summary',
        topics: ['mock topic']
    };
    
    // Step 2: Generate checkpoints
    job.progress(50);
    console.log('[Worker] Generating checkpoints...');
    const checkpoints = await checkpointGenerator.generate(analysis, {
      userId: null, // Initial generation without user context
      skillLevel: analysis.detectedSkillLevel
    });
    
    console.log(`[Worker] Generated ${checkpoints.length} checkpoints`);
    
    // Step 3: Validate and save checkpoints
    job.progress(80);
    console.log('[Worker] Saving to database...');
    await saveCheckpoints(videoId, checkpoints);
    
    // Step 4: Update video status
    job.progress(100);
    console.log('[Worker] Updating status...');
    await updateVideoStatus(videoId, 'complete'); // Changed 'ready' to 'complete' to match Schema
    
    console.log(`[Worker] Job done for ${videoId}`);
    return { videoId, checkpointCount: checkpoints.length };
    
  } catch (error) {
      console.error(`[Worker] Job failed for ${videoId}:`, error);
      await updateVideoStatus(videoId, 'failed');
      throw error;
  }
});

console.log('[Worker] Video Processor registered');
