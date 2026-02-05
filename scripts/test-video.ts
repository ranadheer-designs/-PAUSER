
// We access the service directly to test the logic
// Note: You might need to run this with: npx tsx scripts/test-video.ts VIDEO_ID

import { robustExtractTranscript } from '../apps/web/src/services/robustTranscriptExtractor';

async function testVideo() {
  const videoId = process.argv[2];
  
  if (!videoId) {
    console.error('❌ Please provide a video ID as an argument.');
    console.log('Usage: npx tsx scripts/test-video.ts <VIDEO_ID>');
    process.exit(1);
  }

  console.log(`🎬 Testing extraction for Video ID: ${videoId}`);

  try {
    const result = await robustExtractTranscript(videoId);
    
    if (result.method === 'failed') {
      console.error('❌ Extraction Failed:', result.error);
      console.log('💡 Suggestion: Try a video with known English captions, e.g., dQw4w9WgXcQ');
    } else {
      console.log(`✅ Success! Method used: ${result.method}`);
      console.log(`📊 Found ${result.segments.length} segments.`);
      
      console.log('\n--- First 3 Segments ---');
      result.segments.slice(0, 3).forEach((seg, i) => {
        console.log(`[${i+1}] ${seg.start.toFixed(1)}s: "${seg.text}"`);
      });
      console.log('------------------------\n');
    }

  } catch (error) {
    console.error('❌ Unexpected Error:', error);
  }
}

testVideo();
