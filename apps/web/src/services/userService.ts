import { createClient } from '@/utils/supabase/server';

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  skillProgression: Record<string, 'novice' | 'intermediate' | 'advanced'>;
  difficultyPreference: 'maintain' | 'increase' | 'decrease';
  settings: Record<string, any>;
  performanceHistory: {
    checkpointId: string;
    score: number;
    timestamp: string;
  }[];
}

export class UserService {
  /**
   * Get user profile with aggregated performance data.
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = createClient();

    // Fetch basic profile
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profileRaw) {
      console.error('[UserService] Failed to fetch profile:', profileError);
      return null;
    }
    const profile = profileRaw as any;

    // Fetch skill progression
    const { data: progression } = await supabase
      .from('user_skill_progression')
      .select('topic, skill_level')
      .eq('user_id', userId);
      
    const skillProgression: Record<string, 'novice' | 'intermediate' | 'advanced'> = {};
    (progression || []).forEach((p: any) => {
      skillProgression[p.topic] = p.skill_level;
    });

    // Fetch recent completions for performance history
    const { data: completionsRaw, error: completionsError } = await supabase
      .from('checkpoint_completions')
      .select('checkpoint_id, user_response, completed_at, was_helpful')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(50);

    if (completionsError) {
      console.error('[UserService] Failed to fetch completions:', completionsError);
    }
    const completions = (completionsRaw || []) as any[];

    const settings = profile.settings || {};
    const difficultyPreference = settings.difficultyPreference || 'maintain';

    return {
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      skillProgression: skillProgression,
      difficultyPreference: difficultyPreference,
      settings: settings,
      performanceHistory: completions.map((c: any) => ({
        checkpointId: c.checkpoint_id,
        score: c.was_helpful ? 1 : 0, 
        timestamp: c.completed_at
      })),
    };
  }

  /**
   * Update user profile settings (including adaptive learning fields).
   */
  /**
   * Update user profile settings (including adaptive learning fields).
   */
  static async updateUserProfile(
    userId: string, 
    updates: { 
      skillProgression?: Record<string, string>;
      difficultyPreference?: string;
      [key: string]: any; 
    }
  ): Promise<boolean> {
    const supabase = createClient();

    // 1. Update skill progression if present
    if (updates.skillProgression) {
        const topics = Object.keys(updates.skillProgression);
        for (const topic of topics) {
            const level = updates.skillProgression[topic];
            // Upsert skill level
            const { error: skillError } = await supabase
                .from('user_skill_progression')
                .upsert({
                    user_id: userId,
                    topic: topic,
                    skill_level: level,
                    updated_at: new Date().toISOString()
                } as any, { onConflict: 'user_id,topic' });
            
            if (skillError) {
                console.error('[UserService] Failed to update skill progression:', skillError);
            }
        }
    }

    // 2. Update profile settings (difficultyPreference etc)
    // First get existing settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .single();

    const currentSettings = ((profile as any)?.settings as Record<string, any>) || {};
    
    // allowlist for settings updates to avoid polluting with everything
    const settingsUpdates: Record<string, any> = {};
    if (updates.difficultyPreference) settingsUpdates.difficultyPreference = updates.difficultyPreference;
    
    // Merge other random keys if needed, but strict is better. 
    // For now we assume 'updates' might contain other settings keys.
    Object.keys(updates).forEach(key => {
        if (key !== 'skillProgression') {
            settingsUpdates[key] = updates[key];
        }
    });

    const newSettings = {
      ...currentSettings,
      ...settingsUpdates,
      updated_at: new Date().toISOString()
    };

    const { error } = await (supabase
      .from('profiles') as any)
      .update({
        settings: newSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('[UserService] Failed to update profile:', error);
      return false;
    }

    return true;
  }
}
