// Test script for youtubei.js transcript fetching
import { Innertube } from 'youtubei.js';

async function testTranscript(videoId) {
  console.log('Testing transcript fetch for:', videoId);
  
  try {
    const youtube = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false,
    });
    
    console.log('Innertube instance created');
    
    const info = await youtube.getInfo(videoId);
    console.log('Video title:', info.basic_info?.title);
    
    const transcriptInfo = await info.getTranscript();
    
    if (transcriptInfo && transcriptInfo.transcript && transcriptInfo.transcript.content) {
      const body = transcriptInfo.transcript.content.body;
      if (body && body.initial_segments) {
        console.log(`✓ Found ${body.initial_segments.length} transcript segments`);
        
        // Show first 3 segments
        const sample = body.initial_segments.slice(0, 3);
        sample.forEach((seg, i) => {
          console.log(`  ${i + 1}. [${seg.start_ms}ms] ${seg.snippet?.text?.slice(0, 50)}...`);
        });
        
        return true;
      }
    }
    
    console.log('✗ No transcript available for this video');
    return false;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

// Test with Python tutorial video
testTranscript('VchuKL44s6E')
  .then(success => {
    console.log('\nTest result:', success ? 'PASSED' : 'FAILED');
  });
