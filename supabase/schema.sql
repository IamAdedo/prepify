-- ============================================================================
--  Prepify — UTME CBT Practice — Supabase / Postgres schema
--  Purpose: shared persistence for the Weekly Challenge + Leaderboards, plus
--  optional per-account attempt history. Everything else in the app (exam
--  session, answers, result slip) stays client-side; only cross-user data and
--  synced history live here.
--
--  Apply with:  supabase db push   (or paste into the SQL editor)
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
--  1. Weekly challenges
--     One row per ISO week. week_key is the natural key, e.g. '2026-W31'.
-- ----------------------------------------------------------------------------
create table if not exists public.weekly_challenges (
  id          uuid primary key default gen_random_uuid(),
  week_key    text        not null unique,           -- ISO week, e.g. '2026-W31'
  title       text        not null,
  subjects    text[]      not null default '{}',      -- fixed subject set for the week
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.weekly_challenges is
  'One challenge per ISO week; results feed the leaderboards.';

-- ----------------------------------------------------------------------------
--  2. Leaderboard entries
--     One row per completed challenge attempt (the full-JAMB score).
-- ----------------------------------------------------------------------------
create table if not exists public.leaderboard_entries (
  id                   uuid primary key default gen_random_uuid(),
  challenge_id         uuid not null references public.weekly_challenges(id) on delete cascade,
  candidate_name       text not null check (char_length(candidate_name) between 1 and 120),
  registration_number  text not null,
  mode                 text not null default 'JAMB_FULL'
                          check (mode in ('JAMB_FULL', 'PRACTICE_SINGLE')),
  aggregate_score      int  not null check (aggregate_score between 0 and 400),
  total_correct        int  not null default 0 check (total_correct >= 0),
  total_questions      int  not null default 0 check (total_questions >= 0),
  infractions          int  not null default 0 check (infractions >= 0),
  duration_seconds     int  not null default 0 check (duration_seconds >= 0),
  created_at           timestamptz not null default now()
);

create index if not exists idx_entries_challenge on public.leaderboard_entries(challenge_id);
create index if not exists idx_entries_score
  on public.leaderboard_entries(challenge_id, aggregate_score desc, duration_seconds asc);

comment on table public.leaderboard_entries is
  'One completed weekly-challenge attempt; drives the full-JAMB leaderboard.';

-- ----------------------------------------------------------------------------
--  3. Per-subject scores (normalized)
--     Enables the "leaderboard by subject" view and the rule that a subject
--     with zero participants simply has no leaderboard.
-- ----------------------------------------------------------------------------
create table if not exists public.leaderboard_subject_scores (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references public.leaderboard_entries(id) on delete cascade,
  challenge_id uuid not null references public.weekly_challenges(id) on delete cascade,
  subject      text not null,
  correct      int  not null default 0 check (correct >= 0),
  total        int  not null default 0 check (total >= 0),
  scaled_score int  not null default 0 check (scaled_score between 0 and 100)
);

create index if not exists idx_subject_scores_lookup
  on public.leaderboard_subject_scores(challenge_id, subject, scaled_score desc);

comment on table public.leaderboard_subject_scores is
  'Per-subject breakdown of an entry; a subject only appears if >=1 participant.';

-- ----------------------------------------------------------------------------
--  4. Read views (ranked)
-- ----------------------------------------------------------------------------

-- Full-JAMB leaderboard: rank by aggregate score, tie-break on faster time.
create or replace view public.full_jamb_leaderboard as
select
  e.challenge_id,
  c.week_key,
  e.id                as entry_id,
  e.candidate_name,
  e.aggregate_score,
  e.total_correct,
  e.total_questions,
  e.infractions,
  e.duration_seconds,
  e.created_at,
  rank() over (
    partition by e.challenge_id
    order by e.aggregate_score desc, e.duration_seconds asc, e.created_at asc
  ) as position
from public.leaderboard_entries e
join public.weekly_challenges c on c.id = e.challenge_id
where e.mode = 'JAMB_FULL';

-- By-subject leaderboard: only subjects that actually have participants show up,
-- because this view only contains rows that exist in leaderboard_subject_scores.
create or replace view public.subject_leaderboard as
select
  s.challenge_id,
  c.week_key,
  s.subject,
  s.entry_id,
  e.candidate_name,
  s.correct,
  s.total,
  s.scaled_score,
  e.created_at,
  rank() over (
    partition by s.challenge_id, s.subject
    order by s.scaled_score desc, e.duration_seconds asc, e.created_at asc
  ) as position
from public.leaderboard_subject_scores s
join public.leaderboard_entries e on e.id = s.entry_id
join public.weekly_challenges c on c.id = s.challenge_id;

-- ----------------------------------------------------------------------------
--  5. Row Level Security
--     Public read of leaderboards; public insert of one's own result.
--     Updates/deletes are locked to the service role only.
-- ----------------------------------------------------------------------------
alter table public.weekly_challenges          enable row level security;
alter table public.leaderboard_entries        enable row level security;
alter table public.leaderboard_subject_scores enable row level security;

-- Read: anyone (anon + authenticated) can read challenges and scores.
-- Policies are dropped first so this whole file stays re-runnable (idempotent);
-- Postgres has no "create policy if not exists".
drop policy if exists "challenges_read"     on public.weekly_challenges;
create policy "challenges_read"      on public.weekly_challenges
  for select using (true);
drop policy if exists "entries_read"        on public.leaderboard_entries;
create policy "entries_read"         on public.leaderboard_entries
  for select using (true);
drop policy if exists "subject_scores_read" on public.leaderboard_subject_scores;
create policy "subject_scores_read"  on public.leaderboard_subject_scores
  for select using (true);

-- Insert: anyone can submit a result row (challenges are managed server-side).
drop policy if exists "entries_insert"        on public.leaderboard_entries;
create policy "entries_insert"        on public.leaderboard_entries
  for insert with check (true);
drop policy if exists "subject_scores_insert" on public.leaderboard_subject_scores;
create policy "subject_scores_insert" on public.leaderboard_subject_scores
  for insert with check (true);

-- Challenges are created/updated only by the service role (bypasses RLS),
-- so no anon insert/update policy is defined for weekly_challenges.

-- ----------------------------------------------------------------------------
--  6. Attempt history (optional accounts)
--     One row per completed practice attempt for a signed-in candidate. Anon
--     users keep history in localStorage only; this table syncs it across
--     devices once they sign in with a magic link. Rows are private to their
--     owner via RLS keyed on auth.uid().
-- ----------------------------------------------------------------------------
create table if not exists public.attempts (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  client_attempt_id    text not null,                 -- stable id minted on-device (dedupe key)
  candidate_name       text not null,
  registration_number  text not null default '',
  mode                 text not null default 'JAMB_FULL'
                          check (mode in ('JAMB_FULL', 'PRACTICE_SINGLE')),
  subjects             text[] not null default '{}',
  aggregate_score      int  not null default 0 check (aggregate_score between 0 and 400),
  total_correct        int  not null default 0 check (total_correct >= 0),
  total_questions      int  not null default 0 check (total_questions >= 0),
  accuracy             numeric not null default 0,
  duration_seconds     int  not null default 0 check (duration_seconds >= 0),
  infractions          int  not null default 0 check (infractions >= 0),
  is_weekly_challenge  boolean not null default false,
  subject_scores       jsonb not null default '[]'::jsonb,
  completed_at         timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  unique (user_id, client_attempt_id)                 -- idempotent re-sync
);

create index if not exists idx_attempts_user
  on public.attempts(user_id, completed_at desc);

comment on table public.attempts is
  'Per-account practice attempt history; private to its owner via RLS.';

alter table public.attempts enable row level security;

-- Owners can read/insert/update/delete only their own rows.
drop policy if exists "attempts_select_own" on public.attempts;
create policy "attempts_select_own" on public.attempts
  for select using (auth.uid() = user_id);
drop policy if exists "attempts_insert_own" on public.attempts;
create policy "attempts_insert_own" on public.attempts
  for insert with check (auth.uid() = user_id);
drop policy if exists "attempts_update_own" on public.attempts;
create policy "attempts_update_own" on public.attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "attempts_delete_own" on public.attempts;
create policy "attempts_delete_own" on public.attempts
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
--  7. Seed: current week's challenge (edit dates as needed)
-- ----------------------------------------------------------------------------
insert into public.weekly_challenges (week_key, title, subjects, starts_at, ends_at)
values (
  to_char(now(), 'IYYY') || '-W' || to_char(now(), 'IW'),
  'Weekly UTME Challenge',
  array['Use of English', 'Mathematics', 'Physics', 'Chemistry'],
  date_trunc('week', now()),
  date_trunc('week', now()) + interval '7 days'
)
on conflict (week_key) do nothing;
