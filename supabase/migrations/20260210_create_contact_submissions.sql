-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert contact submissions
CREATE POLICY "Allow anon insert to contact_submissions"
ON public.contact_submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow anonymous users to insert (using authenticated role just in case)
CREATE POLICY "Allow authenticated insert to contact_submissions"
ON public.contact_submissions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Only service role can view submissions (for now)
-- No select policy for anon/authenticated means they can't read what they wrote (security)
