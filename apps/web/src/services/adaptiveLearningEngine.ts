import { UserService } from './userService';

export interface CheckpointCompletion {
  checkpointId: string;
  metadata: {
    topic: string;
    [key: string]: any;
  };
  score: number; // 0 to 1
  timeTaken: number; // seconds
  hintsUsed: number;
}

export class AdaptiveLearningEngine {
  /**
   * Update user profile based on a new checkpoint completion.
   */
  static async updateUserProfile(userId: string, completion: CheckpointCompletion) {
    const userProfile = await UserService.getUserProfile(userId);
    
    if (!userProfile) return;

    // Calculate new skill progression
    const skillUpdate = this.calculateSkillProgression(
      userProfile.skillProgression,
      completion
    );

    // Adjust difficulty preference
    // We add the current completion to history for calculation logic
    // (In reality, it's already in the DB by now usually, but we treat it as the "latest" trigger)
    const currentPerformanceHistory = [
      { 
        checkpointId: completion.checkpointId, 
        score: completion.score, 
        timestamp: new Date().toISOString() 
      },
      ...userProfile.performanceHistory
    ];

    const newDifficultyPreference = this.adjustDifficulty(
      currentPerformanceHistory
    );

    await UserService.updateUserProfile(userId, {
      skillProgression: {
        ...userProfile.skillProgression,
        ...skillUpdate
      },
      difficultyPreference: newDifficultyPreference,
      lastActivity: new Date()
    });
  }

  /**
   * Determine if skill level should be upgraded based on performance.
   */
  private static calculateSkillProgression(
    currentProgression: Record<string, string>, 
    completion: CheckpointCompletion
  ): Record<string, string> {
    const topic = completion.metadata.topic || 'general';
    const currentLevel = currentProgression[topic] || 'novice';
    
    // Simple progression logic
    // High score (> 0.85) promotes Novice -> Intermediate
    // Very high score (> 0.9) promotes Intermediate -> Advanced
    
    if (completion.score > 0.85 && currentLevel === 'novice') {
      return { [topic]: 'intermediate' };
    } else if (completion.score > 0.9 && currentLevel === 'intermediate') {
      return { [topic]: 'advanced' };
    }
    
    // No change
    return {};
  }

  /**
   * Adjust difficulty preference based on recent performance history.
   */
  private static adjustDifficulty(
    performanceHistory: { score: number }[]
  ): 'increase' | 'decrease' | 'maintain' {
    // Look at last 10 attempts
    const recentCompletions = performanceHistory.slice(0, 10);
    
    if (recentCompletions.length < 3) return 'maintain'; // Not enough data

    const avgScore = recentCompletions.reduce(
      (acc, c) => acc + c.score,
      0
    ) / recentCompletions.length;
    
    if (avgScore > 0.9) {
      return 'increase'; // Consistently crushing it, make it harder
    } else if (avgScore < 0.5) {
      return 'decrease'; // Struggling, make it easier
    }
    
    return 'maintain';
  }
}
