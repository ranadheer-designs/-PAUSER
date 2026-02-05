-- Add 'code_practice' and 'practice_resource' to checkpoints constraints
-- This ensures that the new checkpoint types introduced can be saved to the database.

ALTER TABLE public.checkpoints 
  DROP CONSTRAINT IF EXISTS checkpoints_type_check;

ALTER TABLE public.checkpoints 
  ADD CONSTRAINT checkpoints_type_check 
  CHECK (type IN (
    -- Legacy types
    'quiz', 'flashcard', 'code_challenge', 'retrieval',
    -- Phase 6 types
    'prediction', 'explanation', 'one_sentence_rule', 'snapshot',
    -- New Adaptive types
    'practice_resource', 'code_practice'
  ));

-- Grant permissions just in case (redundant if fix-permissions.sql is run, but safe)
GRANT ALL ON TABLE public.checkpoints TO authenticated;
GRANT ALL ON TABLE public.checkpoints TO service_role;
