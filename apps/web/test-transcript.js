const fetch = require('node-fetch');

async function testTranscript(videoId) {
  console.log('Testing transcript fetch for:', videoId);
  
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    const html = await response.text();
    console.log('Page length:', html.length);
    
    // Method 1: Look for captionTracks in ytInitialPlayerResponse
    const captionsMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);
    if (captionsMatch) {
      console.log('✓ Found captionTracks!');
      const urlMatch = captionsMatch[1].match(/"baseUrl":\s*"([^"]+)"/);
      if (urlMatch) {
        const captionsUrl = urlMatch[1].replace(/\\u0026/g, '&');
        console.log('Caption URL:', captionsUrl.slice(0, 150) + '...');
        
        // Fetch the captions
        const captionsResponse = await fetch(captionsUrl);
        const captionsXml = await captionsResponse.text();
        console.log('Captions XML length:', captionsXml.length);
        
        // Count text entries
        const textMatches = captionsXml.match(/<text[^>]*>[^<]*<\/text>/g);
        if (textMatches) {
          console.log('✓ Found', textMatches.length, 'caption entries');
          console.log('Sample:', textMatches[0].slice(0, 100));
        }
      }
    } else {
      console.log('✗ No captionTracks found');
      
      // Check for other patterns
      if (html.includes('playerCaptionsTracklistRenderer')) {
        console.log('Found playerCaptionsTracklistRenderer');
      }
      if (html.includes('"captions"')) {
        console.log('Found captions key');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test with a known video
testTranscript('dQw4w9WgXcQ');
