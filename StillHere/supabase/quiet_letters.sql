-- ════════════════════════════════════════════════════════════════
-- Quiet Letters — backend schema
-- Run this once in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/_/sql/new
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.quiet_letters (
  id          uuid        primary key default gen_random_uuid(),
  recipient   text        not null check (char_length(recipient) between 1 and 32),
  body        text        not null check (char_length(body)      between 1 and 240),
  color       text        not null,
  language    text        default '—',
  created_at  timestamptz not null default now(),
  user_id     uuid        references auth.users (id) on delete set null
);

create index if not exists quiet_letters_created_idx
  on public.quiet_letters (created_at desc);

-- ── Row-Level Security ──
alter table public.quiet_letters enable row level security;

-- Anyone (even anon) can READ all letters
drop policy if exists "letters_read_anyone" on public.quiet_letters;
create policy "letters_read_anyone"
  on public.quiet_letters
  for select
  using (true);

-- Anyone (even anon) can INSERT a letter
drop policy if exists "letters_insert_anyone" on public.quiet_letters;
create policy "letters_insert_anyone"
  on public.quiet_letters
  for insert
  with check (true);

-- Only the author (if signed in) can DELETE their letter
drop policy if exists "letters_delete_own" on public.quiet_letters;
create policy "letters_delete_own"
  on public.quiet_letters
  for delete
  using (auth.uid() is not null and auth.uid() = user_id);

-- ── Realtime (optional, lets the wall update live as new letters arrive) ──
-- Run if you want the wall to update without a page refresh:
-- alter publication supabase_realtime add table public.quiet_letters;
