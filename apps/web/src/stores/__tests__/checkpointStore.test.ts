
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCheckpointStore } from '../checkpointStore';
import { analytics } from '@/lib/analytics';
import type { Checkpoint } from '@pauser/common';

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  analytics: {
    trackCheckpointImpression: vi.fn(),
    trackCheckpointComplete: vi.fn(),
    trackCheckpointSkip: vi.fn(),
  }
}));

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

const mockCheckpoint: Checkpoint = {
  id: 'cp-1',
  contentId: 'vid-1',
  timestamp: 120,
  type: 'quiz',
  prompt: 'Test question',
  difficulty: 0.5,
  aiGenerated: false,
  options: ['A', 'B'],
  answerKey: { index: 0 }
};

describe('checkpointStore', () => {
  beforeEach(() => {
    useCheckpointStore.setState({
      checkpoints: [],
      activeCheckpoint: null,
      completedCheckpoints: new Set(),
    });
    vi.clearAllMocks();
  });

  it('should load checkpoints', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ checkpoints: [mockCheckpoint] })
    });

    await useCheckpointStore.getState().loadCheckpoints('vid-1');

    expect(useCheckpointStore.getState().checkpoints).toEqual([mockCheckpoint]);
    expect(fetchMock).toHaveBeenCalledWith('/api/videos/vid-1/checkpoints');
  });

  it('should set active checkpoint and track impression', () => {
    useCheckpointStore.getState().setActiveCheckpoint(mockCheckpoint);

    expect(useCheckpointStore.getState().activeCheckpoint).toEqual(mockCheckpoint);
    expect(analytics.trackCheckpointImpression).toHaveBeenCalledWith('cp-1', 'vid-1');
  });

  it('should complete checkpoint and track it', async () => {
    useCheckpointStore.setState({ activeCheckpoint: mockCheckpoint });
    fetchMock.mockResolvedValueOnce({ ok: true });

    await useCheckpointStore.getState().completeCheckpoint('cp-1', { answer: 'A' });

    expect(useCheckpointStore.getState().completedCheckpoints.has('cp-1')).toBe(true);
    expect(useCheckpointStore.getState().activeCheckpoint).toBeNull();
    expect(analytics.trackCheckpointComplete).toHaveBeenCalledWith('cp-1', 0, 0.5);
    expect(fetchMock).toHaveBeenCalledWith('/api/checkpoints/cp-1/complete', expect.any(Object));
  });

  it('should skip checkpoint and track it', () => {
    useCheckpointStore.getState().setActiveCheckpoint(mockCheckpoint);
    useCheckpointStore.getState().skipCheckpoint('cp-1');

    expect(useCheckpointStore.getState().activeCheckpoint).toBeNull();
    expect(analytics.trackCheckpointSkip).toHaveBeenCalledWith('cp-1');
  });
});
