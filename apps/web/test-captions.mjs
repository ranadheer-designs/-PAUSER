// Test youtube-captions-scraper with auto-generated captions
import { getSubtitles } from 'youtube-captions-scraper';

async function test(videoId) {
  console.log('Testing youtube-captions-scraper for:', videoId);
  
  // Try multiple language options
  const langOptions = ['en', 'en-US', 'a.en', 'en-GB'];
  
  for (const lang of langOptions) {
    try {
      console.log(`Trying lang: ${lang}`);
      const captions = await getSubtitles({
        videoID: videoId,
        lang: lang
      });
      
      if (captions && captions.length > 0) {
        console.log(`✓ Found ${captions.length} caption entries with lang=${lang}`);
        console.log('\nFirst 3 captions:');
        captions.slice(0, 3).forEach((c, i) => {
          console.log(`  ${i + 1}. [${c.start}s] ${c.text.slice(0, 60)}...`);
        });
        return true;
      }
    } catch (error) {
      console.log(`  Error with ${lang}:`, error.message.slice(0, 100));
    }
  }
  
  return false;
}

// Test with a popular video known to have captions
test('dQw4w9WgXcQ').then(success => {
  console.log('\nResult:', success ? 'PASSED' : 'FAILED');
});
