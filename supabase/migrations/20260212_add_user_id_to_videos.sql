-- Migration: Add user_id to videos table for per-user data isolation
-- Each user gets their own private copy of a video record.

-- 1. Add user_id column (nullable initially for backfill)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill: Assign existing videos to the first user found in profiles.
-- If no profiles exist yet, rows will remain NULL and be cleaned up.
DO $$
DECLARE
  v_first_user UUID;
BEGIN
  SELECT id INTO v_first_user FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  IF v_first_user IS NOT NULL THEN
    UPDATE public.videos SET user_id = v_first_user WHERE user_id IS NULL;
    RAISE NOTICE 'Backfilled existing videos to user: %', v_first_user;
  ELSE
    RAISE NOTICE 'No profiles found. Deleting orphaned videos with no user.';
    DELETE FROM public.videos WHERE user_id IS NULL;
  END IF;
END $$;

-- 3. Make user_id NOT NULL now that backfill is complete
ALTER TABLE public.videos ALTER COLUMN user_id SET NOT NULL;

-- 4. Drop old unique constraint on youtube_id alone
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_youtube_id_key;

-- 5. Add new composite unique constraint: same user can't add same video twice
ALTER TABLE public.videos ADD CONSTRAINT videos_user_youtube_unique UNIQUE (user_id, youtube_id);

-- 6. Add index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);

-- ============================================================================
-- 7. Replace all RLS policies on videos table
-- ============================================================================

-- Drop all existing video policies
DROP POLICY IF EXISTS "Public read videos" ON public.videos;
DROP POLICY IF EXISTS "Any authenticated user can read videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can update videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can delete videos" ON public.videos;

-- Create user-scoped policies
CREATE POLICY "Users can read own videos"
  ON public.videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos"
  ON public.videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
  ON public.videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos"
  ON public.videos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. Update checkpoints RLS to be scoped through video ownership
-- ============================================================================

-- Drop old open-read policy on checkpoints
DROP POLICY IF EXISTS "Public read checkpoints" ON public.checkpoints;
DROP POLICY IF EXISTS "Any authenticated user can read checkpoints" ON public.checkpoints;

-- Checkpoints are readable/writable only if user owns the parent video
CREATE POLICY "Users can read checkpoints for own videos"
  ON public.checkpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert checkpoints for own videos"
  ON public.checkpoints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update checkpoints for own videos"
  ON public.checkpoints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete checkpoints for own videos"
  ON public.checkpoints FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_id AND v.user_id = auth.uid()
    )
  );

-- Also allow service_role full access (for admin/backend operations)
GRANT ALL ON TABLE public.videos TO service_role;
GRANT ALL ON TABLE public.checkpoints TO service_role;
