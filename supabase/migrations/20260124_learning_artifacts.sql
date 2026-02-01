-- Creative Cognitive Checkpoints: Learning Artifacts Schema
-- 
-- This migration creates the learning_artifacts table for storing user responses
-- from cognitive checkpoints: predictions, explanations, and one-sentence rules.
--
-- These artifacts are first-class learning objects that can be:
-- - Viewed in the dashboard
-- - Grouped by video and checkpoint
-- - Converted to flashcards for spaced repetition review

-- ============================================================================
-- LEARNING ARTIFACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.learning_artifacts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_id uuid REFERENCES public.contents(id) ON DELETE CASCADE NOT NULL,
  checkpoint_id uuid REFERENCES public.checkpoints(id) ON DELETE SET NULL,
  
  -- Artifact type (cognitive checkpoint mode)
  type text NOT NULL CHECK (type IN ('prediction', 'explanation', 'one_sentence_rule')),
  
  -- Core content - the user's written response
  user_text text NOT NULL,
  
  -- Optional follow-up text (used for prediction reflections after reveal)
  follow_up_text text,
  
  -- Metadata for context and reconstruction
  prompt_used text,
  required_keyword text,       -- For one_sentence_rule type
  max_words integer,           -- For one_sentence_rule type
  target_audience text,        -- For explanation type ('junior', 'past_self', 'friend')
  concept_name text,           -- The concept being learned
  reveal_timestamp_seconds integer, -- For prediction type - when answer is revealed
  timestamp_seconds integer NOT NULL,
  
  -- Flashcard conversion tracking
  converted_to_flashcard_id uuid REFERENCES public.flashcards(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Size limit enforcement (prevent abuse)
  CHECK (length(user_text) <= 5000),
  CHECK (follow_up_text IS NULL OR length(follow_up_text) <= 2000)
);

COMMENT ON TABLE public.learning_artifacts IS 'User-generated learning artifacts from cognitive checkpoints (predictions, explanations, one-sentence rules)';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Query by user and content (dashboard view)
CREATE INDEX IF NOT EXISTS idx_artifacts_user_content 
  ON public.learning_artifacts(user_id, content_id);

-- Query by type (filtering in dashboard)
CREATE INDEX IF NOT EXISTS idx_artifacts_type 
  ON public.learning_artifacts(type);

-- Query by timestamp within content (timeline view)
CREATE INDEX IF NOT EXISTS idx_artifacts_timestamp 
  ON public.learning_artifacts(content_id, timestamp_seconds);

-- Query unconverted artifacts
CREATE INDEX IF NOT EXISTS idx_artifacts_not_converted 
  ON public.learning_artifacts(user_id) 
  WHERE converted_to_flashcard_id IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.learning_artifacts ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own artifacts
CREATE POLICY "Users manage own artifacts" 
  ON public.learning_artifacts
  FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================================================
-- FLASHCARDS TABLE UPDATE
-- ============================================================================

-- Add artifact reference to flashcards for traceability
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'flashcards' 
    AND column_name = 'artifact_id'
  ) THEN
    ALTER TABLE public.flashcards 
      ADD COLUMN artifact_id uuid REFERENCES public.learning_artifacts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- CHECKPOINTS TABLE UPDATE
-- ============================================================================

-- Update checkpoint type constraint to include new cognitive checkpoint types
ALTER TABLE public.checkpoints 
  DROP CONSTRAINT IF EXISTS checkpoints_type_check;
  
ALTER TABLE public.checkpoints 
  ADD CONSTRAINT checkpoints_type_check 
  CHECK (type IN (
    'quiz', 'flashcard', 'code_challenge', 'retrieval',  -- Legacy types
    'prediction', 'explanation', 'one_sentence_rule'     -- New cognitive types
  ));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_artifact_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic updated_at
DROP TRIGGER IF EXISTS artifact_updated_at ON public.learning_artifacts;
CREATE TRIGGER artifact_updated_at
  BEFORE UPDATE ON public.learning_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_artifact_updated_at();
