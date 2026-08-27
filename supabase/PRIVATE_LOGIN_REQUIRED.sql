-- Podcast Vault V5.6: bắt buộc đăng nhập mới đọc được Podcast / Episode / Music

-- PODCAST
drop policy if exists "public podcasts readable" on public.podcasts;
drop policy if exists "authenticated podcasts readable" on public.podcasts;
create policy "authenticated podcasts readable"
on public.podcasts for select to authenticated
using ((published = true and visibility = 'public') or owner_id = auth.uid());

-- EPISODES
drop policy if exists "public episodes readable" on public.episodes;
drop policy if exists "authenticated episodes readable" on public.episodes;
create policy "authenticated episodes readable"
on public.episodes for select to authenticated
using (
  (published = true and exists (
    select 1 from public.podcasts p
    where p.id = podcast_id and p.published = true and p.visibility = 'public'
  ))
  or exists (select 1 from public.podcasts p where p.id = podcast_id and p.owner_id = auth.uid())
);

-- MUSIC
drop policy if exists "public music readable" on public.music_tracks;
drop policy if exists "authenticated music readable" on public.music_tracks;
create policy "authenticated music readable"
on public.music_tracks for select to authenticated
using (published = true or owner_id = auth.uid());
