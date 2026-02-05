import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js'; // for admin access
import { robustExtractTranscript } from '@/services/robustTranscriptExtractor';
import { analyzeTranscript } from '@/services/intelligentTranscriptAnalyzer';

export async function POST(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  const { videoId } = params;
  console.log(`[API] POST /deepfocus/${videoId} - Starting processing`);

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
  }

  // Use Service Role Key for admin privileges (bypassing RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  let supabase;
  
  if (supabaseUrl && serviceRoleKey) {
      console.log('[API] Using Supabase Service Role Key (Admin Access)');
      supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
      });
  } else {
      console.warn('[API] ⚠️ No Service Role Key found. Using authenticated client (subject to RLS).');
      supabase = createServerClient();
  }

  try {
    // Step 1: Extract Transcript
    console.log('[API] Step 1: Extracting transcript...');
    const extractionResult = await robustExtractTranscript(videoId);
    
    if (extractionResult.segments.length === 0) {
      console.warn(`[API] Failed to extract transcript for ${videoId}`);
      // Depending on requirements, we might fail here or proceed with empty analysis.
      // User says "Handle videos without transcripts gracefully".
      // We'll proceed, but analysis will yield empty results.
    } else {
        console.log(`[API] ✓ Transcript extracted: ${extractionResult.segments.length} segments`);
    }

    // Step 2: Get Video Metadata (for duration)
    // We can use the result from robustExtractor or fetch it if needed.
    // robustTranscriptExtractor usually gets timestamps, so we can estimate duration.
    const duration = extractionResult.segments.length > 0 
        ? extractionResult.segments[extractionResult.segments.length - 1].start + extractionResult.segments[extractionResult.segments.length - 1].duration
        : 0;

    // Step 3: Analyze Transcript
    console.log('[API] Step 3: Analyzing transcript with AI...');
    const analysis = await analyzeTranscript(extractionResult.segments, duration);
    console.log(`[API] ✓ Analysis complete: ${analysis.checkpointSuggestions.length} checkpoints proposed`);

    // Step 4: Save to Database
    console.log('[API] Step 4: Saving to database...');

    // 4a. Update Video (Upsert to ensure it exists)
    // We need title/etc. ideally, but if not available we use placeholders or fetch from YouTube if we had that service.
    // For now we assume video might exist or we insert basic info.
    const { error: videoError } = await supabase.from('videos').upsert({
      youtube_id: videoId,
      title: `Video ${videoId}`, // Ideally we'd fetch title
      duration: Math.ceil(duration),
      transcript: extractionResult.segments,
      transcript_analysis: analysis,
      updated_at: new Date().toISOString()
    }, { onConflict: 'youtube_id' });

    if (videoError) {
      if (videoError.code === '42501') {
         console.error('[API] ❌ Permission Denied (42501) saving video. Please run migration.');
         return NextResponse.json({ error: 'Database Permission Denied', details: 'Run fix-permissions.sql' }, { status: 500 });
      }
      throw videoError;
    }

    // 4b. Save Checkpoints
    if (analysis.checkpointSuggestions.length > 0) {
        // First get the internal ID of the video
        const { data: videoData } = await supabase.from('videos').select('id').eq('youtube_id', videoId).single();
        
        if (videoData) {
            const checkpoints = analysis.checkpointSuggestions.map(cp => {
                let embedded_config: any = { prompt: cp.suggestedPrompt };
                
                if (cp.type === 'code_practice' && cp.codePractice) {
                    embedded_config = {
                        ...embedded_config,
                        language: cp.codePractice.language,
                        starterCode: cp.codePractice.starterCode,
                        solution: cp.codePractice.solution,
                        testCases: cp.codePractice.testCases,
                        hints: cp.codePractice.hints
                    };
                }

                return {
                    video_id: videoData.id,
                    timestamp: cp.timestamp,
                    type: cp.type,
                    title: cp.type === 'code_practice' ? 'Coding Practice' : `${cp.type.toUpperCase()} Checkpoint`,
                    context: cp.reason,
                    embedded_config
                };
            });

            const { error: cpError } = await supabase.from('checkpoints').insert(checkpoints);
             if (cpError) {
                if (cpError.code === '42501') {
                    console.error('[API] ❌ Permission Denied (42501) saving checkpoints.');
                     return NextResponse.json({ error: 'Database Permission Denied (Checkpoints)', details: 'Run fix-permissions.sql' }, { status: 500 });
                }
                console.error('[API] Failed to save checkpoints:', cpError);
                // Non-fatal, we return success for the analysis
            } else {
                console.log(`[API] ✓ Saved ${checkpoints.length} checkpoints`);
            }
        }
    }

    return NextResponse.json({
      success: true,
      videoId,
      transcriptSegments: extractionResult.segments.length,
      checkpoints: analysis.checkpointSuggestions.length,
      analysis
    });

  } catch (error) {
    console.error('[API] Internal Error:', error);
    return NextResponse.json(
      { error: 'Server Error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
