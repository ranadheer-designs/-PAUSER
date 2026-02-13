

const fs = require('fs');

const logFile = 'reproduce_result.txt';
if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

function log(...args) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
    fs.appendFileSync(logFile, msg);
}

process.on('unhandledRejection', (reason, p) => {
  log('Unhandled Rejection at:', p, 'reason:', reason);
});

async function main() {
    const videoId = 'ykaSuShf_Cw';
    log(`Testing DirectFetch for video: ${videoId}`);

    try {
        // 1. Fetch Video Page
        log(`[TranscriptExtractor] DirectFetch: Fetching page for ${videoId}...`);
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`Failed to fetch video page: ${response.status}`);
        }

        const html = await response.text();
        log(`[TranscriptExtractor] DirectFetch: Page fetched, length: ${html.length}`);
        
        // Check for cookies
        const setCookie = response.headers.get('set-cookie');
        log('Cookies from page fetch:', setCookie ? 'FOUND' : 'NOT FOUND');
        if (setCookie) log('Cookie val:', setCookie.substring(0, 50) + '...');

        // 2. Extract Captions URL
        const captionsMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);
        if (!captionsMatch) {
            log('[TranscriptExtractor] DirectFetch: "captionTracks" not found in HTML.');
            if (html.includes('consent.youtube.com')) {
                 log('Got consent page instead of video page.');
            }
            return;
        }

        const tracksJson = `[${captionsMatch[1]}]`;
        let tracks = [];
        try {
            tracks = JSON.parse(tracksJson);
            log(`[TranscriptExtractor] DirectFetch: Parsed ${tracks.length} tracks.`);
        } catch (e) {
            log('[TranscriptExtractor] Failed to parse caption tracks JSON');
            return;
        }

        const englishTrack = tracks.find((t) => t.languageCode === 'en' && !t.kind);
        const autoEnglishTrack = tracks.find((t) => t.languageCode === 'en' && t.kind === 'asr');
        
        const bestTrack = englishTrack || autoEnglishTrack || tracks[0];

        if (!bestTrack || !bestTrack.baseUrl) {
            log('[TranscriptExtractor] DirectFetch: No suitable track found.');
            return;
        }

        const captionsUrl = bestTrack.baseUrl;
        log(`[TranscriptExtractor] DirectFetch: URL: ${captionsUrl.substring(0, 100)}...`);


            const variations = [
                { name: 'Original', url: captionsUrl },
                { name: 'fmt=xml', url: captionsUrl + '&fmt=xml' },
                { name: 'fmt=srv3', url: captionsUrl + '&fmt=srv3' },
                { name: 'fmt=json3', url: captionsUrl + '&fmt=json3' }
            ];

            for (const v of variations) {
                log(`\n--- Testing Variation: ${v.name} ---`);
                try {
                    const headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': `https://www.youtube.com/watch?v=${videoId}`,
                    };
                    if (setCookie) headers['Cookie'] = setCookie;

                    const resp = await fetch(v.url, { headers });
                    log(`Status: ${resp.status}`);
                    const txt = await resp.text();
                    log(`Length: ${txt.length}`);
                    if (txt.length > 0) {
                        log(`SUCCESS with ${v.name}! Preview: ${txt.substring(0, 100)}`);
                    } else {
                        log(`FAILURE with ${v.name}: 0 bytes`);
                    }
                } catch (err) {
                    log(`Error with ${v.name}:`, err);
                }
            }



    } catch (error) {
        log('CRITICAL ERROR:', error);
    }
}


main().then(() => {
    // Print file content to stdout at the very end
    console.log(fs.readFileSync(logFile, 'utf8'));
});

