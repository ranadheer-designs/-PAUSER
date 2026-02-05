/**
 * End-to-End Test for Pauser Deep Focus Flow
 * 
 * Flow:
 * 1. Checks if server is reachable
 * 2. Calls POST /api/deepfocus/:videoId
 * 3. Verifies response structure
 */

const BASE_URL = 'http://localhost:3000';
const VIDEO_ID = 'dQw4w9WgXcQ'; // Never Gonna Give You Up (Reliable captions)

async function runE2ETest() {
  console.log('🚀 Starting End-to-End Test...');
  console.log(`Target: ${BASE_URL}/api/deepfocus/${VIDEO_ID}`);

  try {
    // 1. Check Server Health (Optional, generic check)
    try {
       await fetch(BASE_URL);
    } catch (e) {
       console.error('❌ Server is not reachable at http://localhost:3000');
       console.error('👉 Make sure to run "npm run dev" or "pnpm dev" in another terminal!');
       process.exit(1);
    }

    // 2. Call API
    console.log('\n📡 Sending POST request...');
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/deepfocus/${VIDEO_ID}`, {
      method: 'POST',
      body: JSON.stringify({}), // Body not strictly needed as ID is in URL, but good practice
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ Response received in ${duration}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);

    // 3. Analyze Response
    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Request Failed:', JSON.stringify(data, null, 2));
      
      if (response.status === 500 && JSON.stringify(data).includes('42501')) {
         console.warn('⚠️  Permission Error Detected. Did you run the migration?');
      }
      return;
    }

    console.log('\n✅ Response Success!');
    console.log(`   - Video ID: ${data.videoId}`);
    console.log(`   - Segments: ${data.transcriptSegments}`);
    console.log(`   - Checkpoints: ${data.checkpoints}`);
    
    if (data.analysis) {
      console.log('\n📊 Analysis Preview:');
      console.log(`   - Domain: ${data.analysis.domain}`);
      console.log(`   - Skill Level: ${data.analysis.detectedSkillLevel}`);
      console.log(`   - Topics: ${data.analysis.segments.slice(0, 3).map((s: any) => s.topic).join(', ')}...`);
    }

    console.log('\n✨ E2E Test Passed!');

  } catch (error) {
    console.error('❌ Test Failed with Exception:', error);
  }
}

runE2ETest();
