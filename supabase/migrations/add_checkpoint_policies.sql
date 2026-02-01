-- Migration: Add INSERT policies for contents and checkpoints tables
-- Run this in your Supabase SQL Editor

-- Allow authenticated users to insert contents (videos)
CREATE POLICY "Authenticated users can insert contents" 
ON public.contents 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update their own contents
CREATE POLICY "Users can update contents they created" 
ON public.contents 
FOR UPDATE 
USING (created_by = auth.uid());

-- Allow authenticated users to delete checkpoints for content they have access to
CREATE POLICY "Authenticated users can delete checkpoints" 
ON public.checkpoints 
FOR DELETE 
TO authenticated 
USING (true);

-- Allow authenticated users to insert checkpoints
CREATE POLICY "Authenticated users can insert checkpoints" 
ON public.checkpoints 
FOR INSERT 
TO authenticated 
WITH CHECK (true);
