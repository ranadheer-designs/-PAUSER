-- Fix permissions for videos table
-- Allow authenticated users to insert videos (needed for saving checkpoints)
-- Allow authenticated users to update videos (needed for metadata updates)
-- Allow authenticated users to delete videos (needed for removing videos from dashboard)

-- Drop existing policies if they exist (to be safe/indempotent)
DROP POLICY IF EXISTS "Authenticated users can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can update videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can delete videos" ON public.videos;

-- Create INSERT policy
CREATE POLICY "Authenticated users can insert videos" 
ON public.videos 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create UPDATE policy
CREATE POLICY "Authenticated users can update videos" 
ON public.videos 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Create DELETE policy
CREATE POLICY "Authenticated users can delete videos" 
ON public.videos 
FOR DELETE 
TO authenticated 
USING (true);
