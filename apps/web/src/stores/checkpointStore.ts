import { create } from 'zustand';
import { analytics } from '@/lib/analytics';
import type { Checkpoint } from '@pauser/common';

interface CheckpointStore {
  checkpoints: Checkpoint[];
  activeCheckpoint: Checkpoint | null;
  completedCheckpoints: Set<string>;
  
  loadCheckpoints: (videoId: string) => Promise<void>;
  setActiveCheckpoint: (checkpoint: Checkpoint | null) => void;
  completeCheckpoint: (checkpointId: string, response: any) => Promise<void>;
  skipCheckpoint: (checkpointId: string) => void;
}

export const useCheckpointStore = create<CheckpointStore>((set, get) => ({
  checkpoints: [],
  activeCheckpoint: null,
  completedCheckpoints: new Set(),
  
  loadCheckpoints: async (videoId) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/checkpoints`);
      if (!response.ok) throw new Error('Failed to load checkpoints');
      const data = await response.json();
      set({ checkpoints: data.checkpoints });
    } catch (error) {
      console.error('Failed to load checkpoints:', error);
      // Ideally analytics.trackError(error)
    }
  },
  
  setActiveCheckpoint: (checkpoint) => {
    if (checkpoint) {
      analytics.trackCheckpointImpression(checkpoint.id, checkpoint.contentId); // Assuming contentId is available on checkpoint
    }
    set({ activeCheckpoint: checkpoint });
  },
  
  completeCheckpoint: async (checkpointId, response) => {
    const state = get();
    const checkpoint = state.activeCheckpoint;
    
    // Optimistic update
    const completed = new Set(state.completedCheckpoints);
    completed.add(checkpointId);
    set({ completedCheckpoints: completed, activeCheckpoint: null });
    
    // Track completion
    if (checkpoint) {
      // Calculate duration if we were tracking it, using 0 for now or add start time tracking
       analytics.trackCheckpointComplete(checkpointId, 0, checkpoint.difficulty);
    }

    try {
      await fetch(`/api/checkpoints/${checkpointId}/complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(response)
      });
    } catch (error) {
      console.error('Failed to submit checkpoint completion:', error);
      // Revert if critical, or queue for retry
    }
  },
  
  skipCheckpoint: (checkpointId) => {
    analytics.trackCheckpointSkip(checkpointId);
    set({ activeCheckpoint: null });
  }
}));
