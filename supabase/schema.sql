-- Pauser Database Schema
--
-- Core design principles:
-- 1. All timestamps in UTC
-- 2. UUIDs for all primary keys
-- 3. JSONB for flexible content (tests, options, metadata)
-- 4. Strict foreign key constraints with cascading deletes where appropriate
-- 5. RLS (Row Level Security) enabled on ALL user-data tables

-- Enable dependencies
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. PROFILES (Users)
-- Extends the built-in auth.users table
-- ============================================================================
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  display_name text,
  avatar_url text,
  
  -- Gamification / Engagement
  streak_count integer default 0,
  total_reviews integer default 0,
  
  -- User Preferences
  settings jsonb default '{}'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.profiles is 'Extended user profile data linked to Supabase Auth';

-- ============================================================================
-- 2. CONTENTS (Videos & Playlists)
-- The primary learning materials
-- ============================================================================
create table public.contents (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('video', 'playlist')),
  external_id text not null, -- YouTube ID
  
  title text not null,
  description text,
  thumbnail_url text,
  
  -- Video specific
  duration_seconds integer,
  
  -- Metadata (Channel info, tags, etc.)
  metadata jsonb default '{}'::jsonb,
  
  -- Ownership (Nullable for system-wide public content)
  created_by uuid references public.profiles(id) on delete set null,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.contents is 'Videos and playlists imported into Pauser';
create index idx_contents_external_id on public.contents(external_id);

-- ============================================================================
-- 3. CHECKPOINTS
-- Interaction points that pause the video
-- ============================================================================
create table public.checkpoints (
  id uuid default uuid_generate_v4() primary key,
  content_id uuid references public.contents(id) on delete cascade not null,
  
  timestamp_seconds integer not null,
  type text not null check (type in ('quiz', 'flashcard', 'code_challenge', 'retrieval')),
  
  title text,
  prompt text not null,
  
  -- Quiz defaults
  options jsonb, -- ["Option A", "Option B"]
  
  -- The "Truth"
  answer_key jsonb not null, -- { "index": 0 } or { "keywords": ["react", "hook"] }
  explanation text,
  
  -- Metadata
  difficulty integer default 1 check (difficulty between 1 and 5),
  ai_generated boolean default false,
  verified boolean default false,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.checkpoints is 'Pauses in the video for active recall';
create index idx_checkpoints_content_id on public.checkpoints(content_id);

-- ============================================================================
-- 4. CONCEPTS
-- Atomic units of knowledge extracted from checkpoints
-- ============================================================================
create table public.concepts (
  id uuid default uuid_generate_v4() primary key,
  checkpoint_id uuid references public.checkpoints(id) on delete cascade,
  
  name text not null,
  definition text,
  keywords text[],
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- 5. CHALLENGES
-- Coding exercises with deterministic evaluation
-- ============================================================================
create table public.challenges (
  id uuid default uuid_generate_v4() primary key,
  checkpoint_id uuid references public.checkpoints(id) on delete cascade not null,
  
  title text not null,
  description text not null,
  
  starter_code text not null,
  language text not null default 'javascript',
  
  -- Test cases for the runner
  -- [{ "input": "...", "expected": "...", "hidden": false }]
  test_cases jsonb not null default '[]'::jsonb,
  
  solution_code text, -- Hidden from user until solved/revealed
  time_limit_ms integer default 2000,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- 6. ATTEMPTS
-- User interactions with checkpoints and challenges
-- ============================================================================
create table public.attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  checkpoint_id uuid references public.checkpoints(id) on delete cascade not null,
  challenge_id uuid references public.challenges(id) on delete cascade,
  
  user_answer jsonb not null, -- Selected option index or submitted code
  is_correct boolean not null,
  score real default 0, -- 0.0 to 1.0
  
  time_spent_ms integer,
  attempt_number integer default 1,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_attempts_user_checkpoint on public.attempts(user_id, checkpoint_id);

-- ============================================================================
-- 7. FLASHCARDS
-- SRS cards generated from concepts or checkpoints
-- ============================================================================
create table public.flashcards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  checkpoint_id uuid references public.checkpoints(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete cascade,
  
  front text not null,
  back text not null,
  tags text[],
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- 8. REVIEWS
-- Spaced Repetition history (SM-2, future FSRS compatible)
-- ============================================================================
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  flashcard_id uuid references public.flashcards(id) on delete cascade not null,
  
  -- Review Data
  rating integer not null check (rating between 0 and 5), -- 0=Fail, 5=Perfect
  
  -- SM-2 State (Snapshot at time of review)
  ease_factor real not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  
  -- FSRS State (Future Proofing columns, nullable for now)
  -- stability real,
  -- difficulty real,
  -- state integer,
  
  reviewed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  next_review_at timestamp with time zone not null
);

create index idx_reviews_user_due on public.reviews(user_id, next_review_at);

-- ============================================================================
-- 9. USER_CONTENTS
-- User progress on specific content
-- ============================================================================
create table public.user_contents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id uuid references public.contents(id) on delete cascade not null,
  
  current_time_seconds integer default 0,
  completed_checkpoints uuid[] default '{}',
  is_completed boolean default false,
  
  last_watched_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(user_id, content_id)
);

-- ============================================================================
-- 10. NOTES
-- Timestamped annotations on video content
-- ============================================================================
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id uuid references public.contents(id) on delete cascade not null,
  
  -- Timestamp data (in seconds, using real for sub-second precision)
  start_time_seconds real not null,
  end_time_seconds real,
  
  -- Note content
  title text,
  body text not null,
  
  -- State
  is_draft boolean default true,
  
  -- Sync metadata for offline-first architecture
  local_id text, -- Client-generated ID for offline sync tracking
  synced_at timestamp with time zone,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Constraints
  check (start_time_seconds >= 0),
  check (end_time_seconds is null or end_time_seconds > start_time_seconds),
  check (length(body) <= 10240) -- 10KB max note size
);

comment on table public.notes is 'Timestamped video annotations for focused learning';

-- Indexes for performance
create index idx_notes_user_content on public.notes(user_id, content_id);
create index idx_notes_timestamp on public.notes(content_id, start_time_seconds);
create index idx_notes_local_id on public.notes(local_id) where local_id is not null;
create index idx_notes_updated_at on public.notes(updated_at) where synced_at is null;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.contents enable row level security;
alter table public.checkpoints enable row level security;
alter table public.concepts enable row level security;
alter table public.challenges enable row level security;
alter table public.attempts enable row level security;
alter table public.flashcards enable row level security;
alter table public.reviews enable row level security;
alter table public.user_contents enable row level security;
alter table public.notes enable row level security;

-- Policies

-- Profiles
create policy "Users can see own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Contents (Public read, Admin write)
create policy "Anyone can read contents" on public.contents for select using (true);

-- Checkpoints (Public read)
create policy "Anyone can read checkpoints" on public.checkpoints for select using (true);

-- User Data (Strict Ownership)
create policy "Users manage own attempts" on public.attempts
  for all using (auth.uid() = user_id);

create policy "Users manage own flashcards" on public.flashcards
  for all using (auth.uid() = user_id);

create policy "Users manage own reviews" on public.reviews
  for all using (auth.uid() = user_id);

create policy "Users manage own content progress" on public.user_contents
  for all using (auth.uid() = user_id);

create policy "Users manage own notes" on public.notes
  for all using (auth.uid() = user_id);
