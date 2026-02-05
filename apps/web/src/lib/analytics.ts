
interface CheckpointMetrics {
  impressionRate: number;
  completionRate: number;
  skipRate: number;
  avgTimeSpent: number;
  timingDeviation: number;
  retentionRate: number;
  skillProgression: number;
  helpfulnessRating: number;
  willingnessToPay: number;
  aiConfidence: number;
  checkpointRelevance: number;
}

type CheckpointMetricEvent = 
  | 'checkpoint_shown'
  | 'checkpoint_completed'
  | 'checkpoint_skipped'
  | 'checkpoint_rated';

interface AnalyticsPayload {
  checkpointId?: string;
  videoId?: string;
  timestamp?: number;
  duration?: number;
  rating?: number;
  difficulty?: number;
  metadata?: Record<string, any>;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  
  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public track(event: CheckpointMetricEvent, payload: AnalyticsPayload) {
    // In a real app, this would send data to Mixpanel/Amplitude/etc.
    console.log(`[Analytics] ${event}:`, payload);
    
    // Example: sending to a backend endpoint
    /*
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload, timestamp: Date.now() })
    }).catch(console.error);
    */
  }

  public trackCheckpointImpression(checkpointId: string, videoId: string) {
    this.track('checkpoint_shown', { checkpointId, videoId });
  }

  public trackCheckpointComplete(checkpointId: string, duration: number, difficulty: number) {
    this.track('checkpoint_completed', { checkpointId, duration, difficulty });
  }

  public trackCheckpointSkip(checkpointId: string) {
    this.track('checkpoint_skipped', { checkpointId });
  }

  public trackCheckpointRating(checkpointId: string, rating: number) {
    this.track('checkpoint_rated', { checkpointId, rating });
  }
}

export const analytics = AnalyticsService.getInstance();
