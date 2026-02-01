// Test youtubei.js transcript with different approach
import { Innertube } from 'youtubei.js';

async function test(videoId) {
  console.log('Testing youtubei.js for:', videoId);
  
  try {
    const youtube = await Innertube.create({
      lang: 'en',
      location: 'US',
    });
    
    console.log('Getting video info...');
    const info = await youtube.getInfo(videoId);
    console.log('Video title:', info.basic_info?.title);
    
    // Check what caption options are available
    console.log('\nCaption info:');
    console.log('Has captions:', !!info.captions);
    
    if (info.captions) {
      console.log('Caption tracks available:', info.captions.caption_tracks?.length || 0);
      
      if (info.captions.caption_tracks) {
        info.captions.caption_tracks.forEach((track, i) => {
          console.log(`  ${i + 1}. ${track.name?.text} (${track.language_code})`);
        });
      }
    }
    
    // Try to get transcript
    console.log('\nTrying getTranscript...');
    try {
      const transcript = await info.getTranscript();
      console.log('Transcript object keys:', Object.keys(transcript || {}));
      
      if (transcript?.transcript?.content?.body) {
        const segments = transcript.transcript.content.body.initial_segments;
        console.log('Segments found:', segments?.length || 0);
        
        if (segments && segments.length > 0) {
          console.log('\nFirst 3 segments:');
          segments.slice(0, 3).forEach((seg, i) => {
            console.log(`  ${i + 1}. ${seg.snippet?.text?.slice(0, 60)}...`);
          });
          return true;
        }
      }
    } catch (transcriptError) {
      console.log('Transcript error:', transcriptError.message);
    }
    
    return false;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

test('VchuKL44s6E').then(success => {
  console.log('\nResult:', success ? 'PASSED' : 'FAILED');
});
