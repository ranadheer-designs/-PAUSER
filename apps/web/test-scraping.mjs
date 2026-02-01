// Test script for YouTube page scraping transcript - debug version

async function testPageScraping(videoId) {
  console.log('Testing page scraping for:', videoId);
  
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    const html = await response.text();
    console.log('Page length:', html.length);
    
    // Look for captionTracks
    const captionsMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);
    if (captionsMatch) {
      console.log('✓ Found captionTracks');
      console.log('Raw match (first 500 chars):', captionsMatch[1].slice(0, 500));
      
      // Extract URL - need to handle escaped quotes properly
      const urlMatch = captionsMatch[1].match(/"baseUrl":\s*"(https:[^"]+)"/);
      if (urlMatch) {
        let captionsUrl = urlMatch[1];
        // Replace escaped unicode
        captionsUrl = captionsUrl.replace(/\\u0026/g, '&');
        console.log('\nFull captions URL:\n', captionsUrl);
        
        // Fetch captions with same headers
        const captionsResponse = await fetch(captionsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        
        console.log('\nCaption response status:', captionsResponse.status);
        console.log('Caption response headers:', Object.fromEntries(captionsResponse.headers));
        
        const captionsXml = await captionsResponse.text();
        console.log('Captions XML length:', captionsXml.length);
        console.log('First 500 chars of XML:', captionsXml.slice(0, 500));
        
        // Count segments
        const matches = [...captionsXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
        console.log(`\n✓ Found ${matches.length} caption segments`);
        
        if (matches.length > 0) {
          console.log('\nFirst 3 segments:');
          matches.slice(0, 3).forEach((m, i) => {
            console.log(`  ${i + 1}. ${m[1].slice(0, 60)}...`);
          });
          return true;
        }
      } else {
        console.log('Could not extract baseUrl from captionTracks');
      }
    } else {
      console.log('✗ No captionTracks found in page');
    }
    
    return false;
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    return false;
  }
}

testPageScraping('VchuKL44s6E').then(success => {
  console.log('\nTest result:', success ? 'PASSED' : 'FAILED');
});
