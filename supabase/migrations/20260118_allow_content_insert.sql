-- Migration: Allow authenticated users to create content records
-- This is needed for the notes sync feature to work properly

-- Add INSERT policy for contents table
-- Allows authenticated users to create content records when adding notes for new videos
create policy "Authenticated users can create contents" 
  on public.contents 
  for insert 
  to authenticated
  with check (true);
