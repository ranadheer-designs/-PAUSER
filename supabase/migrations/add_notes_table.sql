-- ============================================================================
-- NOTES TABLE MIGRATION
-- Run this in Supabase SQL Editor to add notes table
-- ============================================================================

-- Create notes table
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id uuid references public.contents(id) on delete cascade not null,
  
  start_time_seconds real not null,
  end_time_seconds real,
  
  title text,
  body text not null,
  
  is_draft boolean default true,
  
  local_id text,
  synced_at timestamp with time zone,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  check (start_time_seconds >= 0),
  check (end_time_seconds is null or end_time_seconds > start_time_seconds),
  check (length(body) <= 10240)
);

comment on table public.notes is 'Timestamped video annotations for focused learning';

-- Create indexes
create index idx_notes_user_content on public.notes(user_id, content_id);
create index idx_notes_timestamp on public.notes(content_id, start_time_seconds);
create index idx_notes_local_id on public.notes(local_id) where local_id is not null;
create index idx_notes_updated_at on public.notes(updated_at) where synced_at is null;

-- Enable RLS
alter table public.notes enable row level security;

-- Create RLS policy
create policy "Users manage own notes" on public.notes
  for all using (auth.uid() = user_id);
