-- Smart Learning Checkpoints: Practice Resource Support
-- 
-- This migration adds support for practice_resource checkpoint type
-- which links to external platforms like LeetCode, HackerRank, Codewars.
--
-- These checkpoints are detected through:
-- 1. Exact problem name matching from video transcripts
-- 2. Concept-based matching (e.g., "hash map" -> related problems)

-- ============================================================================
-- UPDATE CHECKPOINT TYPE CONSTRAINT
-- ============================================================================

-- Add practice_resource to the allowed checkpoint types
ALTER TABLE public.checkpoints 
  DROP CONSTRAINT IF EXISTS checkpoints_type_check;

ALTER TABLE public.checkpoints 
  ADD CONSTRAINT checkpoints_type_check 
  CHECK (type IN (
    'quiz', 'flashcard', 'code_challenge', 'retrieval',      -- Legacy types
    'prediction', 'explanation', 'one_sentence_rule', 'snapshot',  -- Cognitive types
    'practice_resource'  -- NEW: External practice problems
  ));

-- ============================================================================
-- PRACTICE ATTEMPTS TABLE
-- ============================================================================

-- Track user engagement with practice problems
CREATE TABLE IF NOT EXISTS public.practice_attempts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  checkpoint_id uuid REFERENCES public.checkpoints(id) ON DELETE SET NULL,
  
  -- Problem details (denormalized for easier querying)
  platform text NOT NULL CHECK (platform IN ('leetcode', 'hackerrank', 'codewars')),
  problem_id text NOT NULL,
  problem_title text NOT NULL,
  problem_url text NOT NULL,
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Session tracking
  opened_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  time_spent_seconds integer DEFAULT 0,
  completed boolean DEFAULT false,
  
  -- Match metadata
  match_confidence numeric(3,2),
  match_reason text,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.practice_attempts IS 'Tracks user interactions with practice problems (LeetCode, HackerRank, etc.) suggested through smart checkpoints';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Query by user (dashboard statistics)
CREATE INDEX IF NOT EXISTS idx_practice_attempts_user 
  ON public.practice_attempts(user_id);

-- Query by platform (analytics)
CREATE INDEX IF NOT EXISTS idx_practice_attempts_platform 
  ON public.practice_attempts(platform);

-- Query by completion status
CREATE INDEX IF NOT EXISTS idx_practice_attempts_completed 
  ON public.practice_attempts(user_id, completed);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own attempts
CREATE POLICY "Users manage own practice attempts" 
  ON public.practice_attempts
  FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_practice_attempt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic updated_at
DROP TRIGGER IF EXISTS practice_attempt_updated_at ON public.practice_attempts;
CREATE TRIGGER practice_attempt_updated_at
  BEFORE UPDATE ON public.practice_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_practice_attempt_updated_at();
