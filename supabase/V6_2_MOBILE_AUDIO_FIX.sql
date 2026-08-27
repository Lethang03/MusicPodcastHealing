-- Podcast Vault V6.2: accurate listening time + music duration
-- Run this once in Supabase SQL Editor.

alter table public.music_tracks
add column if not exists duration double precision not null default 0;

create table if not exists public.listening_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type text not null check (media_type in ('podcast','music')),
  media_id uuid not null,
  listened_seconds integer not null check (listened_seconds > 0 and listened_seconds <= 300),
  listened_at timestamptz not null default now()
);

create index if not exists listening_events_user_time_idx
on public.listening_events(user_id, listened_at desc);

alter table public.listening_events enable row level security;

drop policy if exists "listening events own select" on public.listening_events;
create policy "listening events own select" on public.listening_events
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "listening events own insert" on public.listening_events;
create policy "listening events own insert" on public.listening_events
for insert to authenticated with check (auth.uid() = user_id);
