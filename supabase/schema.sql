-- Pauser Database Schema
--
-- Core design principles:
-- 1. All timestamps in UTC
-- 2. UUIDs for all primary keys
-- 3. JSONB for flexible content
-- 4. RLS enabled on ALL user-data tables

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

-- ============================================================================
-- 2. VIDEOS (Formerly Contents)
-- ============================================================================
create table public.videos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  youtube_id text not null,
  title text not null,
  description text,
  duration integer default 0,
  channel_name text,
  transcript jsonb,
  transcript_analysis jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(user_id, youtube_id)
);

-- ============================================================================
-- 3. CHECKPOINTS
-- ============================================================================
create table public.checkpoints (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references public.videos(id) on delete cascade not null,
  
  timestamp integer not null,
  type text not null, -- 'CODE_PRACTICE', 'REFLECTION', etc.
  title text not null,
  context text,
  estimated_time text,
  difficulty text,
  
  embedded_config jsonb default '{}'::jsonb not null,
  metadata jsonb,
  ai_confidence float,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_checkpoints_video on public.checkpoints(video_id);
create index idx_checkpoints_timestamp on public.checkpoints(video_id, timestamp);

-- ============================================================================
-- 4. CHECKPOINT_COMPLETIONS (Formerly Attempts)
-- ============================================================================
create table public.checkpoint_completions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  checkpoint_id uuid references public.checkpoints(id) on delete cascade not null,
  
  completed_at timestamp with time zone default timezone('utc'::text, now()),
  time_spent integer,
  user_response jsonb,
  test_results jsonb,
  hints_used integer default 0,
  difficulty_rating integer,
  was_helpful boolean,
  
  unique(user_id, checkpoint_id)
);

create index idx_completions_user on public.checkpoint_completions(user_id);
create index idx_completions_checkpoint on public.checkpoint_completions(checkpoint_id);

-- ============================================================================
-- 5. USER_SKILL_PROGRESSION
-- ============================================================================
create table public.user_skill_progression (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  topic text not null,
  skill_level text not null, -- 'novice', 'intermediate', 'advanced'
  checkpoints_completed integer default 0,
  last_practiced timestamp with time zone,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(user_id, topic)
);

create index idx_skill_progression_user on public.user_skill_progression(user_id);

-- ============================================================================
-- 6. REVIEW_CARDS (Formerly Reviews/Flashcards)
-- ============================================================================
create table public.review_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  checkpoint_id uuid references public.checkpoints(id) on delete cascade not null,
  
  next_review date not null,
  interval_days integer default 1,
  ease_factor float default 2.5,
  repetitions integer default 0,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_review_cards_due on public.review_cards(user_id, next_review);

-- ============================================================================
-- 7. CHECKPOINT_ANALYTICS
-- ============================================================================
create table public.checkpoint_analytics (
  id uuid default uuid_generate_v4() primary key,
  checkpoint_id uuid references public.checkpoints(id) on delete cascade,
  impressions integer default 0,
  completions integer default 0,
  skips integer default 0,
  avg_time_spent float,
  avg_difficulty_rating float,
  created_at date default current_date,
  
  unique(checkpoint_id, created_at)
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.checkpoints enable row level security;
alter table public.checkpoint_completions enable row level security;
alter table public.user_skill_progression enable row level security;
alter table public.review_cards enable row level security;
alter table public.checkpoint_analytics enable row level security;

-- Policies

-- Profiles
create policy "Users can see own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Videos (User-scoped)
create policy "Users can read own videos" on public.videos for select using (auth.uid() = user_id);
create policy "Users can insert own videos" on public.videos for insert with check (auth.uid() = user_id);
create policy "Users can update own videos" on public.videos for update using (auth.uid() = user_id);
create policy "Users can delete own videos" on public.videos for delete using (auth.uid() = user_id);

-- Checkpoints (scoped through video ownership)
create policy "Users can read checkpoints for own videos" on public.checkpoints for select using (exists (select 1 from public.videos v where v.id = video_id and v.user_id = auth.uid()));

-- User Data
create policy "Users manage own completions" on public.checkpoint_completions for all using (auth.uid() = user_id);
create policy "Users manage own progression" on public.user_skill_progression for all using (auth.uid() = user_id);
create policy "Users manage own review cards" on public.review_cards for all using (auth.uid() = user_id);
