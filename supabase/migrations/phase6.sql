-- Phase 6 Migration
-- Maps existing concepts to new schema

-- 1. VIDEOS (Replaces contents)
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id VARCHAR(20) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  channel_name VARCHAR(255),
  transcript JSONB,
  transcript_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. CHECKPOINTS (Replaces generic checkpoints)
-- We drop the old constraint if it exists or use a new table
-- Given the significant field changes types (VARCHAR vs ENUM), it's safer to create new
-- But we must handle the name collision.
-- STRATEGY: Alter existing or create new? The user request implies CREATE TABLE checkpoints.
-- I'll rename the old table to checkpoints_legacy to be safe.

ALTER TABLE IF EXISTS public.checkpoints RENAME TO checkpoints_legacy;

CREATE TABLE public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL, -- seconds into video
  type VARCHAR(50) NOT NULL, -- CODE_PRACTICE, REFLECTION, etc.
  title VARCHAR(255) NOT NULL,
  context TEXT,
  estimated_time VARCHAR(20),
  difficulty VARCHAR(20),
  embedded_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- editor config, quiz questions, etc.
  metadata JSONB, -- learning objectives, prerequisites, etc.
  ai_confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. CHECKPOINT_COMPLETIONS (Replaces attempts)
DROP TABLE IF EXISTS public.checkpoint_completions;
CREATE TABLE public.checkpoint_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  time_spent INTEGER, -- seconds
  user_response JSONB, -- code, answers, reflections
  test_results JSONB, -- for code checkpoints
  hints_used INTEGER DEFAULT 0,
  difficulty_rating INTEGER, -- 1-5 user feedback
  was_helpful BOOLEAN,
  UNIQUE(user_id, checkpoint_id)
);

-- 4. USER_SKILL_PROGRESSION (New)
DROP TABLE IF EXISTS public.user_skill_progression;
CREATE TABLE public.user_skill_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic VARCHAR(100) NOT NULL,
  skill_level VARCHAR(20) NOT NULL, -- novice, intermediate, advanced
  checkpoints_completed INTEGER DEFAULT 0,
  last_practiced TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, topic)
);

-- 5. REVIEW_CARDS (Replaces reviews/flashcards)
DROP TABLE IF EXISTS public.review_cards;
CREATE TABLE public.review_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  next_review DATE NOT NULL,
  interval_days INTEGER DEFAULT 1,
  ease_factor FLOAT DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. CHECKPOINT_ANALYTICS (New)
DROP TABLE IF EXISTS public.checkpoint_analytics;
CREATE TABLE public.checkpoint_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID REFERENCES public.checkpoints(id),
  impressions INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  skips INTEGER DEFAULT 0,
  avg_time_spent FLOAT,
  avg_difficulty_rating FLOAT,
  created_at DATE DEFAULT CURRENT_DATE,
  UNIQUE(checkpoint_id, created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoints_video ON public.checkpoints(video_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON public.checkpoints(video_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_completions_user ON public.checkpoint_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_checkpoint ON public.checkpoint_completions(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_review_cards_due ON public.review_cards(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_skill_progression_user ON public.user_skill_progression(user_id);

-- RLS Policies (Basic enablement)
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read videos" ON public.videos FOR SELECT USING (true);

ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read checkpoints" ON public.checkpoints FOR SELECT USING (true);

ALTER TABLE public.checkpoint_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own completions" ON public.checkpoint_completions USING (auth.uid() = user_id);

ALTER TABLE public.user_skill_progression ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progression" ON public.user_skill_progression USING (auth.uid() = user_id);

ALTER TABLE public.review_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cards" ON public.review_cards USING (auth.uid() = user_id);
