-- Phase 6 Fix: Repoint FKs to new tables
-- Run AFTER phase6.sql and phase6_data_migration.sql

-- 1. Updates for NOTES table
ALTER TABLE public.notes
  DROP CONSTRAINT IF EXISTS notes_content_id_fkey;

ALTER TABLE public.notes
  ADD CONSTRAINT notes_content_id_fkey
  FOREIGN KEY (content_id)
  REFERENCES public.videos(id)
  ON DELETE CASCADE;


-- 2. Updates for LEARNING_ARTIFACTS table (content_id -> videos)
ALTER TABLE public.learning_artifacts
  DROP CONSTRAINT IF EXISTS learning_artifacts_content_id_fkey;

ALTER TABLE public.learning_artifacts
  ADD CONSTRAINT learning_artifacts_content_id_fkey
  FOREIGN KEY (content_id)
  REFERENCES public.videos(id)
  ON DELETE CASCADE;

-- 3. Fix LEARNING_ARTIFACTS checkpoint_id references
-- The old checkpoints are in 'checkpoints_legacy', new table is empty.
-- We NULL out orphaned references to allow the constraint to be applied.
ALTER TABLE public.learning_artifacts
  DROP CONSTRAINT IF EXISTS learning_artifacts_checkpoint_id_fkey;

UPDATE public.learning_artifacts
SET checkpoint_id = NULL
WHERE checkpoint_id IS NOT NULL
  AND checkpoint_id NOT IN (SELECT id FROM public.checkpoints);

ALTER TABLE public.learning_artifacts
  ADD CONSTRAINT learning_artifacts_checkpoint_id_fkey
  FOREIGN KEY (checkpoint_id)
  REFERENCES public.checkpoints(id)
  ON DELETE SET NULL;


-- 4. Fix FLASHCARDS checkpoint_id references (same issue)
ALTER TABLE public.flashcards
  DROP CONSTRAINT IF EXISTS flashcards_checkpoint_id_fkey;

UPDATE public.flashcards
SET checkpoint_id = NULL
WHERE checkpoint_id IS NOT NULL
  AND checkpoint_id NOT IN (SELECT id FROM public.checkpoints);

ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_checkpoint_id_fkey
  FOREIGN KEY (checkpoint_id)
  REFERENCES public.checkpoints(id)
  ON DELETE CASCADE;

