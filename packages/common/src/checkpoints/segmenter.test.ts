import { describe, it, expect } from 'vitest';
import { parseYouTubeChapters, segmentByTime, segmentVideo } from './segmenter';

describe('Segmenter', () => {
  describe('parseYouTubeChapters', () => {
    it('should parse simple MM:SS chapters', () => {
      const description = `
        0:00 Intro
        2:30 The Problem
        5:45 Solution
      `;
      const chapters = parseYouTubeChapters(description);
      expect(chapters).toHaveLength(3);
      expect(chapters[0]).toEqual({ startTime: 0, title: 'Intro' });
      expect(chapters[1]).toEqual({ startTime: 150, title: 'The Problem' }); // 2*60 + 30
      expect(chapters[2]).toEqual({ startTime: 345, title: 'Solution' }); // 5*60 + 45
    });

    it('should parse HH:MM:SS chapters', () => {
      const description = `
        01:00:00 Long Video Start
      `;
      const chapters = parseYouTubeChapters(description);
      expect(chapters[0]).toEqual({ startTime: 3600, title: 'Long Video Start' });
    });

    it('should handle timestamp at end of line', () => {
      const description = `
        Intro 0:00
        Conclusion 10:00
      `;
      const chapters = parseYouTubeChapters(description);
      expect(chapters).toEqual([
        { startTime: 0, title: 'Intro' },
        { startTime: 600, title: 'Conclusion' }
      ]);
    });

    it('should ignore lines without timestamps', () => {
      const description = `
        This is a video.
        0:00 Start
        Subscribe!
      `;
      const chapters = parseYouTubeChapters(description);
      expect(chapters).toHaveLength(1);
    });
  });

  describe('segmentByTime', () => {
    it('should create chunks of fallback interval', () => {
      const duration = 600; // 10 mins
      const config = { fallbackIntervalSeconds: 300, minSegmentSeconds: 60 } as any;
      const segments = segmentByTime(duration, config);
      
      expect(segments).toHaveLength(2);
      expect(segments[0].endTime).toBe(300);
      expect(segments[1].startTime).toBe(300);
      expect(segments[1].endTime).toBe(600);
    });

    it('should merge tiny last segment', () => {
      const duration = 320; // 5 mins 20 secs
      const config = { fallbackIntervalSeconds: 300, minSegmentSeconds: 60 } as any;
      
      // Should merge the 20s overlap into the first segment
      const segments = segmentByTime(duration, config);
      expect(segments).toHaveLength(1);
      expect(segments[0].endTime).toBe(320);
    });
  });

  describe('segmentVideo', () => {
    it('should prefer chapters if available', () => {
      const segments = segmentVideo(1000, "0:00 A\n5:00 B", undefined, { preferChapters: true } as any);
      expect(segments).toHaveLength(2);
      expect(segments[0].title).toBe('A');
    });

    it('should use fallback if no chapters found', () => {
      const segments = segmentVideo(600, "No chapters here");
      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0].title).toContain('Part');
    });
  });
});
