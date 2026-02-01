-- Add 'snapshot' type to learning_artifacts and checkpoints
-- Strictly favoring 'snapshot' for the new feature "Understanding Snapshots"

ALTER TABLE public.learning_artifacts 
  DROP CONSTRAINT IF EXISTS learning_artifacts_type_check;

ALTER TABLE public.learning_artifacts 
  ADD CONSTRAINT learning_artifacts_type_check 
  CHECK (type IN ('prediction', 'explanation', 'one_sentence_rule', 'snapshot'));

ALTER TABLE public.checkpoints 
  DROP CONSTRAINT IF EXISTS checkpoints_type_check;

ALTER TABLE public.checkpoints 
  ADD CONSTRAINT checkpoints_type_check 
  CHECK (type IN (
    -- Keeping legacy types to avoid breaking existing data, but application logic will only use 'snapshot'
    'quiz', 'flashcard', 'code_challenge', 'retrieval',
    'prediction', 'explanation', 'one_sentence_rule',
    'snapshot'
  ));
