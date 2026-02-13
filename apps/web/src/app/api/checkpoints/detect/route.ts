
import { NextResponse } from 'next/server';
import { AIService } from '@pauser/common';
import { 
  SemanticSegmenter, 
  CapabilityMapper, 
  TemplateService, 
  SyntacticDetector,
  SyntacticDetector as SyntacticDetectorClass,
  CHECKPOINT_TEMPLATES
} from '@pauser/common';

// Initialize Services
// Ideally these are singletons or cached
const aiConfig = {
  enabled: true,
  model: 'meta-llama/llama-3.3-70b-instruct:free', // Default model
  apiKey: process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || '',
};

const aiService = new AIService(aiConfig);
const segmenter = new SemanticSegmenter(aiService);
const mapper = new CapabilityMapper();
const templateService = new TemplateService();
const syntacticDetector = new SyntacticDetectorClass();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { segments, videoId } = body;

    if (!segments || !Array.isArray(segments)) {
      return NextResponse.json({ error: 'Invalid segments' }, { status: 400 });
    }

    console.log(`[API] Detecting checkpoints for video ${videoId} with ${segments.length} segments`);

    // 1. Syntactic Detection (Fast)
    // Run on all segments
    const actionableBlocks = syntacticDetector.detect(segments);
    console.log(`[API] Detected ${actionableBlocks.length} actionable blocks`);

    // 2. Semantic Detection (Slow, AI)
    // We might want to limit this to a window or chunks. 
    // For now, process what was sent.
    const moments = await segmenter.detectMoments(segments);
    console.log(`[API] Detected ${moments.length} teaching moments`);

    const checkpoints = [];

    // 3. Mapping & Generation
    for (const moment of moments) {
      // Find overlapping actionable block
      // Moment range is relative to chunk start? No, SemanticSegmenter returns absolute ranges now.
      
      const matchedBlock = actionableBlocks.find(block => {
         // Simple overlap check
         // Block is a segment, having start/end
         const blockStart = block.segment.startTime;
         const blockEnd = block.segment.endTime;
         
         return (blockStart < moment.range.end && blockEnd > moment.range.start);
      });

      const capability = mapper.map(moment, matchedBlock);
      const template = templateService.getTemplateForCapability(capability);

      if (template) {
         // 4. Payload Construction
         // In a real implementation, we would call AI here to fill the template precisely.
         // For now, we perform a heuristic fill.
         
         const filled = templateService.fillTemplate(template, {
            concept: moment.transcript_text.substring(0, 50) + "...",
            columns: "columns",
            table_name: "table",
            function_name: "function",
            functionality: "this component"
         });

         checkpoints.push({
            timestamp: moment.range.end,
            type: template.type,
            title: filled.title,
            task: filled.task,
            runner: template.runner,
            difficulty: 'beginner',
            duration_estimate_min: 5,
            // Additional metadata for the runner
            meta: {
               capability,
               intent: moment.intent
            }
         });
      }
    }

    return NextResponse.json({ checkpoints });

  } catch (error) {
    console.error('[API] Checkpoint detection failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
