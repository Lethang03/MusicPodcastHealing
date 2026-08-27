-- Podcast Vault Community V2
-- Chạy toàn bộ trong Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  role text not null default 'listener' check (role in ('listener','creator','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.podcasts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  author text,
  category text,
  cover_url text,
  visibility text not null default 'public' check (visibility in ('public','private','unlisted')),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  title text not null,
  description text,
  audio_url text not null,
  duration double precision not null default 0,
  season_number integer,
  episode_number integer,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_episodes_podcast on public.episodes(podcast_id);
create index if not exists idx_episodes_published on public.episodes(published_at desc);

create table if not exists public.listening_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  "current_time" double precision not null default 0,
  duration double precision not null default 0,
  progress_percent double precision not null default 0,
  completed boolean not null default false,
  last_listened_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

create table if not exists public.listening_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  listened_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  timestamp double precision not null default 0,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  timestamp double precision not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.playlist_episodes (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (playlist_id, episode_id)
);

alter table public.profiles enable row level security;
alter table public.podcasts enable row level security;
alter table public.episodes enable row level security;
alter table public.listening_progress enable row level security;
alter table public.favorites enable row level security;
alter table public.listening_history enable row level security;
alter table public.notes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_episodes enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select using (true);
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);

drop policy if exists "public podcasts readable" on public.podcasts;
drop policy if exists "authenticated podcasts readable" on public.podcasts;
create policy "authenticated podcasts readable" on public.podcasts
for select to authenticated using (
  (published=true and visibility='public') or owner_id=auth.uid()
);
drop policy if exists "creator podcast insert" on public.podcasts;
create policy "creator podcast insert" on public.podcasts for insert with check (
  auth.uid()=owner_id and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('creator','admin'))
);
drop policy if exists "owner podcast update" on public.podcasts;
create policy "owner podcast update" on public.podcasts for update using (
  owner_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

drop policy if exists "public episodes readable" on public.episodes;
drop policy if exists "authenticated episodes readable" on public.episodes;
create policy "authenticated episodes readable" on public.episodes
for select to authenticated using (
  published=true and exists(select 1 from public.podcasts p where p.id=podcast_id and p.published=true and p.visibility='public')
  or exists(select 1 from public.podcasts p where p.id=podcast_id and p.owner_id=auth.uid())
);
drop policy if exists "creator episode insert" on public.episodes;
create policy "creator episode insert" on public.episodes for insert with check (
  exists(select 1 from public.podcasts p where p.id=podcast_id and (p.owner_id=auth.uid() or exists(select 1 from public.profiles pr where pr.id=auth.uid() and pr.role='admin')))
);
drop policy if exists "owner episode update" on public.episodes;
create policy "owner episode update" on public.episodes for update using (
  exists(select 1 from public.podcasts p where p.id=podcast_id and (p.owner_id=auth.uid() or exists(select 1 from public.profiles pr where pr.id=auth.uid() and pr.role='admin')))
);

drop policy if exists "progress own" on public.listening_progress;
create policy "progress own" on public.listening_progress for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "favorites own" on public.favorites;
create policy "favorites own" on public.favorites for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "history own" on public.listening_history;
create policy "history own" on public.listening_history for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "notes own" on public.notes;
create policy "notes own" on public.notes for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "bookmarks own" on public.bookmarks;
create policy "bookmarks own" on public.bookmarks for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "playlists own" on public.playlists;
create policy "playlists own" on public.playlists for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "playlist episodes own" on public.playlist_episodes;
create policy "playlist episodes own" on public.playlist_episodes for all using (
  exists(select 1 from public.playlists p where p.id=playlist_id and p.user_id=auth.uid())
) with check (
  exists(select 1 from public.playlists p where p.id=playlist_id and p.user_id=auth.uid())
);

-- Storage buckets
insert into storage.buckets (id,name,public)
values ('podcast-audio','podcast-audio',true)
on conflict (id) do update set public=true;

insert into storage.buckets (id,name,public)
values ('podcast-covers','podcast-covers',true)
on conflict (id) do update set public=true;

drop policy if exists "public podcast storage read" on storage.objects;
create policy "public podcast storage read" on storage.objects for select using (
  bucket_id in ('podcast-audio','podcast-covers')
);

drop policy if exists "creator podcast storage upload" on storage.objects;
create policy "creator podcast storage upload" on storage.objects for insert to authenticated with check (
  bucket_id in ('podcast-audio','podcast-covers')
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('creator','admin'))
);

-- SAU KHI TẠO TÀI KHOẢN CHỦ WEB:
-- thay email bên dưới rồi chạy riêng câu lệnh này:
-- update public.profiles
-- set role='admin'
-- where id=(select id from auth.users where email='YOUR_EMAIL@example.com');


-- V3 optional listening analytics
create table if not exists public.listening_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  listened_seconds integer not null default 0
);

alter table public.listening_sessions enable row level security;
drop policy if exists "sessions own" on public.listening_sessions;
create policy "sessions own" on public.listening_sessions for all
using(auth.uid()=user_id) with check(auth.uid()=user_id);


-- V4 Music library
create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  artist text,
  album text,
  cover_url text,
  audio_url text,
  youtube_url text,
  source_type text not null default 'uploaded' check (source_type in ('uploaded','youtube')),
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.music_tracks enable row level security;

drop policy if exists "public music readable" on public.music_tracks;
drop policy if exists "authenticated music readable" on public.music_tracks;
create policy "authenticated music readable" on public.music_tracks
for select to authenticated using (published=true or owner_id=auth.uid());

drop policy if exists "creator music insert" on public.music_tracks;
create policy "creator music insert" on public.music_tracks for insert with check (
  auth.uid()=owner_id
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('creator','admin'))
);

drop policy if exists "creator music update" on public.music_tracks;
create policy "creator music update" on public.music_tracks for update using (
  owner_id=auth.uid()
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

insert into storage.buckets (id,name,public)
values ('music-audio','music-audio',true)
on conflict (id) do update set public=true;

insert into storage.buckets (id,name,public)
values ('music-covers','music-covers',true)
on conflict (id) do update set public=true;

drop policy if exists "public music storage read" on storage.objects;
create policy "public music storage read" on storage.objects for select using (
  bucket_id in ('music-audio','music-covers')
);

drop policy if exists "creator music storage upload" on storage.objects;
create policy "creator music storage upload" on storage.objects for insert to authenticated with check (
  bucket_id in ('music-audio','music-covers')
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('creator','admin'))
);


-- V5 Content Manager: delete policies
drop policy if exists "owner podcast delete" on public.podcasts;
create policy "owner podcast delete" on public.podcasts for delete using (
  owner_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

drop policy if exists "owner episode delete" on public.episodes;
create policy "owner episode delete" on public.episodes for delete using (
  exists(select 1 from public.podcasts p where p.id=podcast_id and (p.owner_id=auth.uid() or exists(select 1 from public.profiles pr where pr.id=auth.uid() and pr.role='admin')))
);

drop policy if exists "creator music delete" on public.music_tracks;
create policy "creator music delete" on public.music_tracks for delete using (
  owner_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

drop policy if exists "creator podcast storage delete" on storage.objects;
create policy "creator podcast storage delete" on storage.objects for delete to authenticated using (
  bucket_id in ('podcast-audio','podcast-covers')
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('creator','admin'))
);

drop policy if exists "creator music storage delete" on storage.objects;
create policy "creator music storage delete" on storage.objects for delete to authenticated using (
  bucket_id in ('music-audio','music-covers')
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('creator','admin'))
);
