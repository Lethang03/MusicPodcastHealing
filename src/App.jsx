import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  Home, Library, Search, Heart, ListMusic, History, LogOut, Play, Pause,
  SkipBack, SkipForward, Volume2, Moon, Sun, Plus, Clock3, Bookmark,
  StickyNote, ChevronRight, X, Headphones, UserRound, Upload, ShieldCheck,
  ChevronDown, MoreHorizontal, WifiOff, Smartphone, CheckCircle2, BarChart3,
  Flame, Trophy, UserCircle2, Trash2, ArrowUp, ArrowDown, Music2, Disc3, LoaderCircle, RotateCcw, Bell, Grid2X2, Rows3, Settings, Repeat2
} from 'lucide-react'
import { supabase, supabaseReady } from './lib/supabase'
import { demoEpisodes, demoPodcasts } from './lib/demoData'

const STORAGE_KEY = 'podcast-vault-community-v2'

function fmt(sec=0){
  if(!Number.isFinite(sec)) return '0:00'
  const s=Math.max(0,Math.floor(sec)), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), r=String(s%60).padStart(2,'0')
  return h?`${h}:${String(m).padStart(2,'0')}:${r}`:`${m}:${r}`
}
function readLocal(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}}
function writeLocal(v){localStorage.setItem(STORAGE_KEY,JSON.stringify(v))}
function localDateKey(value=new Date()){const d=value instanceof Date?value:new Date(value);if(Number.isNaN(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function useEscapeClose(close){useEffect(()=>{const handler=e=>{if(e.key==='Escape')close()};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[close])}
const titleFor=p=>({home:'Podcast',music:'Âm nhạc',musicDetail:'Chi tiết bài hát',search:'Tìm kiếm Podcast',library:'Thư viện Podcast',podcastDetail:'Chi tiết Podcast',favorites:'Podcast yêu thích',playlists:'Playlist Podcast',history:'Lịch sử Podcast',stats:'Thống kê nghe',profile:'Hồ sơ',podcastStudio:'Podcast Studio',musicStudio:'Music Studio'})[p]||'Podcast Vault'

export default function App(){
  const [session,setSession]=useState(null)
  const [authLoading,setAuthLoading]=useState(supabaseReady)
  const [profile,setProfile]=useState(null)
  const [authOpen,setAuthOpen]=useState(false)
  const [authMode,setAuthMode]=useState('login')
  const [page,setPage]=useState('home')
  const [theme,setTheme]=useState(()=>readLocal().theme||'dark')
  const [podcasts,setPodcasts]=useState(demoPodcasts)
  const [episodes,setEpisodes]=useState(demoEpisodes)
  const [loadingLibrary,setLoadingLibrary]=useState(true)
  const [progress,setProgress]=useState(()=>readLocal().progress||{})
  const [favorites,setFavorites]=useState(()=>readLocal().favorites||[])
  const [history,setHistory]=useState(()=>readLocal().history||[])
  const [playlists,setPlaylists]=useState(()=>readLocal().playlists||[{id:'local-night',name:'Nghe buổi tối',episode_ids:[]}])
  const [notes,setNotes]=useState(()=>readLocal().notes||[])
  const [bookmarks,setBookmarks]=useState(()=>readLocal().bookmarks||[])
  const [currentId,setCurrentId]=useState(()=>readLocal().currentId||null)
  const [query,setQuery]=useState('')
  const [toast,setToast]=useState('')
  const [noteOpen,setNoteOpen]=useState(false)
  const [fullPlayer,setFullPlayer]=useState(false)
  const [online,setOnline]=useState(navigator.onLine)
  const [installPrompt,setInstallPrompt]=useState(null)
  const [queue,setQueue]=useState(()=>readLocal().queue||[])
  const [profileOpen,setProfileOpen]=useState(false)
  const [tracks,setTracks]=useState([])
  const [currentTrackId,setCurrentTrackId]=useState(()=>readLocal().currentTrackId||null)
  const [activePlayer,setActivePlayer]=useState(()=>readLocal().activePlayer||null)
  const [selectedPodcastId,setSelectedPodcastId]=useState(null)
  const [selectedTrackId,setSelectedTrackId]=useState(null)
  const [listeningEvents,setListeningEvents]=useState([])
  const [playRequest,setPlayRequest]=useState(0)
  const deferredQuery=useDeferredValue(query)

  const podcastById=useMemo(()=>Object.fromEntries((podcasts||[]).filter(Boolean).map(p=>[p.id,p])),[podcasts])
  const current=(episodes||[]).find(e=>e.id===currentId)||null
  const currentTrack=(tracks||[]).find(t=>t.id===currentTrackId)||null
  const canCreate=['admin','creator'].includes(profile?.role)

  const persist=useCallback((patch={})=>{
    writeLocal({...readLocal(),theme,progress,favorites,history,playlists,notes,bookmarks,currentId,queue,currentTrackId,activePlayer,...patch})
  },[theme,progress,favorites,history,playlists,notes,bookmarks,currentId,queue,currentTrackId,activePlayer])

  useEffect(() => {
    persist()
  }, [theme,progress,favorites,history,playlists,notes,bookmarks,currentId,queue,currentTrackId,activePlayer,persist])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(()=>{
    const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'
    window.scrollTo({top:0,behavior})
  },[page])
  useEffect(()=>{
    const on=()=>setOnline(true), off=()=>setOnline(false)
    window.addEventListener('online',on);window.addEventListener('offline',off)
    return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off)}
  },[])
  useEffect(()=>{
    const h=e=>{e.preventDefault();setInstallPrompt(e)}
    window.addEventListener('beforeinstallprompt',h)
    return()=>window.removeEventListener('beforeinstallprompt',h)
  },[])

  useEffect(()=>{
    if(!supabaseReady){
      setAuthLoading(false)
      setLoadingLibrary(false)
      return
    }
    supabase.auth.getSession().then(({data})=>{
      setSession(data.session)
      setAuthLoading(false)
    })
    const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>{
      setSession(s)
      setAuthLoading(false)
      if(!s){
        setProfile(null)
        setPodcasts([])
        setEpisodes([])
        setTracks([])
        setCurrentId(null)
        setCurrentTrackId(null)
      }
    })
    return()=>sub.subscription.unsubscribe()
  },[])

  const loadPublicLibrary=useCallback(async()=>{
    if(!supabaseReady||!session?.user){
      setPodcasts([])
      setEpisodes([])
      setTracks([])
      setLoadingLibrary(false)
      return
    }
    setLoadingLibrary(true)
    const [{data:p,error:pe},{data:e,error:ee},{data:t,error:te}]=await Promise.all([
      supabase.from('podcasts').select('*').eq('published',true).eq('visibility','public').order('created_at',{ascending:false}),
      supabase.from('episodes').select('*').eq('published',true).order('published_at',{ascending:false}),
      supabase.from('music_tracks').select('*').eq('published',true).order('created_at',{ascending:false})
    ])
    if(!pe) setPodcasts((p||[]).map(x=>({...x,image:x.cover_url||x.image})))
    if(!ee) setEpisodes(e||[])
    if(!te) setTracks(t||[])
    setLoadingLibrary(false)
  },[session])
  useEffect(()=>{loadPublicLibrary()},[loadPublicLibrary])
  useEffect(()=>{
    if(loadingLibrary)return
    if(currentTrackId&&!tracks.some(t=>t.id===currentTrackId)){setCurrentTrackId(null);if(activePlayer==='music')setActivePlayer(null)}
    if(currentId&&!episodes.some(e=>e.id===currentId)){setCurrentId(null);if(activePlayer==='podcast')setActivePlayer(null)}
  },[loadingLibrary,tracks,episodes,currentTrackId,currentId,activePlayer])

  useEffect(()=>{
    if(!supabaseReady||!session?.user){setProfile(null);return}
    ;(async()=>{
      const uid=session.user.id
      const [pr,pg,f,h,n,b,pls,ple,le]=await Promise.all([
        supabase.from('profiles').select('*').eq('id',uid).maybeSingle(),
        supabase.from('listening_progress').select('*').eq('user_id',uid),
        supabase.from('favorites').select('episode_id').eq('user_id',uid),
        supabase.from('listening_history').select('*').eq('user_id',uid).order('listened_at',{ascending:false}).limit(100),
        supabase.from('notes').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
        supabase.from('bookmarks').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
        supabase.from('playlists').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
        supabase.from('playlist_episodes').select('*'),
        supabase.from('listening_events').select('media_type,media_id,listened_seconds,listened_at').eq('user_id',uid).order('listened_at',{ascending:false})
      ])
      if(pr.data)setProfile(pr.data)
      if(pg.data)setProgress(Object.fromEntries(pg.data.map(x=>[x.episode_id,x])))
      if(f.data)setFavorites(f.data.map(x=>x.episode_id))
      if(h.data)setHistory(h.data)
      if(n.data)setNotes(n.data)
      if(b.data)setBookmarks(b.data)
      if(le?.data)setListeningEvents(le.data)
      if(pls.data){
        setPlaylists(pls.data.map(p=>({...p,episode_ids:(ple.data||[]).filter(x=>x.playlist_id===p.id).sort((a,b)=>a.position-b.position).map(x=>x.episode_id)})))
      }
    })()
  },[session])

  const saveProgress=useCallback(async(episode,currentTime,duration,completed=false)=>{
    if(!episode)return
    const item={episode_id:episode.id,current_time:currentTime,duration:duration||episode.duration||0,progress_percent:duration?Math.min(100,currentTime/duration*100):0,completed,last_listened_at:new Date().toISOString()}
    setProgress(prev=>({...prev,[episode.id]:{...prev[episode.id],...item}}))
    if(supabaseReady&&session?.user&&online){
      await supabase.from('listening_progress').upsert({user_id:session.user.id,...item},{onConflict:'user_id,episode_id'})
    }
  },[session,online])

  const addHistory=useCallback(async episode=>{
    if(!episode)return
    const item={id:crypto.randomUUID(),episode_id:episode.id,listened_at:new Date().toISOString()}
    setHistory(prev=>[item,...prev.filter(x=>x.episode_id!==episode.id)].slice(0,100))
    if(supabaseReady&&session?.user&&online) await supabase.from('listening_history').insert({user_id:session.user.id,episode_id:episode.id})
  },[session,online])

  const recordListening=useCallback(async(mediaType,mediaId,seconds)=>{
    const safe=Math.max(0,Math.min(300,Math.round(Number(seconds)||0)))
    if(!safe||!mediaId)return
    const event={media_type:mediaType,media_id:mediaId,listened_seconds:safe,listened_at:new Date().toISOString()}
    setListeningEvents(prev=>[event,...prev].slice(0,5000))
    if(supabaseReady&&session?.user&&online){
      await supabase.from('listening_events').insert({user_id:session.user.id,...event})
    }
  },[session,online])

  const toggleFav=async id=>{
    const exists=favorites.includes(id)
    setFavorites(prev=>exists?prev.filter(x=>x!==id):[id,...prev])
    if(supabaseReady&&session?.user&&online){
      if(exists)await supabase.from('favorites').delete().eq('user_id',session.user.id).eq('episode_id',id)
      else await supabase.from('favorites').insert({user_id:session.user.id,episode_id:id})
    }else if(!session) setToast('Đã lưu trên thiết bị. Đăng nhập để đồng bộ.')
  }

  const addBookmark=async(id,timestamp)=>{
    const item={id:crypto.randomUUID(),episode_id:id,timestamp,created_at:new Date().toISOString()}
    setBookmarks(prev=>[item,...prev]);setToast(`Đã bookmark tại ${fmt(timestamp)}`)
    if(supabaseReady&&session?.user&&online) await supabase.from('bookmarks').insert({user_id:session.user.id,episode_id:id,timestamp})
  }
  const addNote=async(text,timestamp)=>{
    if(!current||!text.trim())return
    const item={id:crypto.randomUUID(),episode_id:current.id,timestamp,content:text.trim(),created_at:new Date().toISOString()}
    setNotes(prev=>[item,...prev]);setNoteOpen(false);setToast(`Đã lưu ghi chú tại ${fmt(timestamp)}`)
    if(supabaseReady&&session?.user&&online)await supabase.from('notes').insert({user_id:session.user.id,episode_id:current.id,timestamp,content:text.trim()})
  }

  const menu=[['home',Headphones,'Podcast'],['music',Music2,'Âm nhạc'],['library',Library,'Thư viện'],['playlists',ListMusic,'Playlist'],['profile',UserRound,'Hồ sơ']]
  const continueList=useMemo(()=>Object.values(progress).filter(p=>!p.completed&&p.current_time>10).sort((a,b)=>new Date(b.last_listened_at).getTime()-new Date(a.last_listened_at).getTime()).map(p=>episodes.find(e=>e.id===p.episode_id)).filter(Boolean),[progress,episodes])
  const filtered=useMemo(()=>{
    const needle=deferredQuery.trim().toLocaleLowerCase('vi')
    if(!needle)return episodes
    return episodes.filter(e=>{const p=podcastById[e.podcast_id];return`${e.title} ${e.description||''} ${p?.title||''} ${p?.author||''}`.toLocaleLowerCase('vi').includes(needle)})
  },[episodes,podcastById,deferredQuery])

  const stats=useMemo(()=>{
    const totalSeconds=listeningEvents.reduce((sum,e)=>sum+Math.max(0,Number(e.listened_seconds)||0),0)
    const completed=Object.values(progress).filter(p=>p.completed).length
    const podcastSeconds={}
    for(const event of listeningEvents){
      if(event.media_type!=='podcast')continue
      const ep=episodes.find(e=>String(e.id)===String(event.media_id))
      if(!ep)continue
      podcastSeconds[ep.podcast_id]=(podcastSeconds[ep.podcast_id]||0)+(Number(event.listened_seconds)||0)
    }
    const topPodcastId=Object.entries(podcastSeconds).sort((a,b)=>b[1]-a[1])[0]?.[0]
    const dateSet=new Set([
      ...listeningEvents.map(e=>localDateKey(e.listened_at)).filter(Boolean),
      ...history.map(h=>localDateKey(h.listened_at)).filter(Boolean)
    ])
    let streak=0
    const now=new Date()
    for(let i=0;i<400;i++){
      const d=new Date(now);d.setDate(now.getDate()-i)
      const key=localDateKey(d)
      if(dateSet.has(key))streak++
      else if(i===0)continue
      else break
    }
    return {totalSeconds,completed,topPodcastId,streak}
  },[listeningEvents,progress,history,episodes])

  const playEpisode=id=>{
    if(!id)return
    if(activePlayer==='podcast'&&currentId===id)setPlayRequest(v=>v+1)
    else{setActivePlayer('podcast');setCurrentId(id)}
    setQueue(prev=>prev.filter(x=>x!==id))
  }
  const playTrack=id=>{
    if(!id)return
    if(activePlayer==='music'&&currentTrackId===id)setPlayRequest(v=>v+1)
    else{setCurrentTrackId(id);setActivePlayer('music')}
  }
  const nextTrack=()=>{
    if(!tracks.length)return
    const idx=tracks.findIndex(t=>t.id===currentTrackId)
    const next=tracks[(idx>=0?idx+1:0)%tracks.length]
    if(next?.audio_url)playTrack(next.id)
    else{
      const playable=tracks.find(t=>t.audio_url&&t.id!==currentTrackId)||tracks.find(t=>t.audio_url)
      if(playable)playTrack(playable.id)
    }
  }
  const previousTrack=()=>{
    if(!tracks.length)return
    const idx=tracks.findIndex(t=>t.id===currentTrackId)
    const prev=tracks[(idx>0?idx-1:tracks.length-1)]
    if(prev?.audio_url)playTrack(prev.id)
    else{
      const playable=[...tracks].reverse().find(t=>t.audio_url&&t.id!==currentTrackId)||[...tracks].reverse().find(t=>t.audio_url)
      if(playable)playTrack(playable.id)
    }
  }
  const openPodcast=id=>{
    if(!id)return
    setSelectedPodcastId(id)
    setPage('podcastDetail')
  }
  const openTrack=id=>{
    if(!id)return
    setSelectedTrackId(id)
    setPage('musicDetail')
  }
  const addToQueue=id=>{
    if(!id||queue.includes(id)||id===currentId)return
    setQueue(prev=>[...prev,id])
    setToast('Đã thêm vào Nghe tiếp theo')
  }
  const handleLogout=async()=>{
    if(supabaseReady) await supabase.auth.signOut()
    setPage('home')
    setAuthMode('login')
    setAuthOpen(false)
    setProfileOpen(false)
    setCurrentId(null)
    setCurrentTrackId(null)
    setActivePlayer(null)
    setSelectedPodcastId(null)
    setSelectedTrackId(null)
  }

  const previousEpisode=()=>{
    if(!current)return
    const same=episodes.filter(e=>e.podcast_id===current.podcast_id)
    if(!same.length)return
    const idx=same.findIndex(e=>e.id===current.id)
    const prev=idx>0?same[idx-1]:same[same.length-1]
    if(prev)setCurrentId(prev.id)
  }

  const nextEpisode=()=>{
    // Queue luôn được ưu tiên. Khi Queue hết, tiếp tục theo thứ tự tập của podcast.
    if(queue.length){
      const [next,...rest]=queue
      setQueue(rest);setCurrentId(next);return
    }
    if(current){
      const same=episodes.filter(e=>e.podcast_id===current.podcast_id)
      if(!same.length)return
      const idx=same.findIndex(e=>e.id===current.id)
      const next=idx>=0&&same[idx+1]?same[idx+1]:same[0]
      if(next)setCurrentId(next.id)
    }
  }

  if(authLoading){
    return <div className="auth-gate loading-gate"><div className="gate-brand"><span className="brand-mark"><Headphones size={23}/></span><strong>Podcast Vault</strong></div><div className="gate-loader"/><p>Đang kiểm tra phiên đăng nhập...</p></div>
  }

  if(!session){
    return <div className="auth-gate">
      <div className="gate-glow gate-glow-a"/><div className="gate-glow gate-glow-b"/>
      <section className="gate-card">
        <div className="gate-brand"><span className="brand-mark"><Headphones size={23}/></span><div><strong>Podcast Vault</strong><small>PRIVATE AUDIO LIBRARY</small></div></div>
        <span className="pill">Members only</span>
        <h1>Podcast và âm nhạc của bạn, chỉ dành cho người có tài khoản.</h1>
        <p>Đăng nhập để truy cập thư viện Podcast, Âm nhạc, playlist, lịch sử, tiến độ nghe và thống kê cá nhân.</p>
        <div className="gate-actions">
          <button className="primary" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}><UserRound size={18}/> Đăng nhập</button>
          <button className="gate-secondary" onClick={()=>{setAuthMode('signup');setAuthOpen(true)}}><Plus size={18}/> Tạo tài khoản</button>
        </div>
        <div className="gate-features"><span>🎙 Podcast riêng</span><span>🎵 Thư viện nhạc</span><span>⏱ Lưu tiến độ</span></div>
      </section>
      {authOpen&&<AuthModal close={()=>setAuthOpen(false)} session={session} mode={authMode} setMode={setAuthMode}/>}
    </div>
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={()=>setPage('home')}><span className="brand-mark"><Headphones size={21}/></span><span><strong>Podcast</strong><em>Vault</em></span></button>
      <nav>{menu.map(([id,Icon,label])=><button key={id} data-page={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={19}/><span>{label}</span></button>)}
      {canCreate&&<><button className={page==='podcastStudio'?'active':''} onClick={()=>setPage('podcastStudio')}><ShieldCheck size={19}/><span>Podcast Studio</span></button><button className={page==='musicStudio'?'active':''} onClick={()=>setPage('musicStudio')}><Music2 size={19}/><span>Music Studio</span></button></>}</nav>
      <div className="sidebar-foot">
        <button onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}<span>{theme==='dark'?'Chế độ sáng':'Chế độ tối'}</span></button>
        {installPrompt&&<button onClick={async()=>{await installPrompt.prompt();setInstallPrompt(null)}}><Smartphone size={18}/><span>Cài ứng dụng</span></button>}
        {session?<button onClick={handleLogout}><LogOut size={18}/><span>Đăng xuất</span></button>:<button onClick={()=>setAuthOpen(true)}><UserRound size={18}/><span>Đăng nhập</span></button>}
      </div>
    </aside>

    <main className="main">
      {!online&&<div className="offline"><WifiOff size={15}/> Đang offline. Tiến độ vẫn lưu trên máy và sẽ đồng bộ khi có mạng.</div>}
      <header className="topbar reference-topbar">
        <button className="topbar-brand-mobile" onClick={()=>setPage('home')}><span className="brand-mark"><Headphones size={19}/></span><strong>Podcast Vault</strong></button>
        <div className="top-search">
          <Search size={18}/>
          <input value={query} onChange={e=>setQuery(e.target.value)} onFocus={()=>setPage('search')} placeholder="Tìm podcast, tập..."/>
        </div>
        <div className="topbar-actions">
          <button className="top-icon-btn" title="Thông báo" aria-label="Thông báo" onClick={()=>setToast('Bạn chưa có thông báo mới.')}><Bell size={19}/><i/></button>
          <button className="avatar-btn" onClick={()=>setPage('profile')}><span>{(profile?.display_name||session?.user?.email||'P')[0].toUpperCase()}</span></button>
        </div>
      </header>
      <div className="page-content" key={page}>
        {page!=='library'&&page!=='podcastDetail'&&page!=='musicDetail'&&<div className="page-title-row"><div><div className="eyebrow">PODCAST VAULT</div><h1>{titleFor(page)}</h1></div></div>}

        {page==='home'&&<HomePage podcasts={podcasts} episodes={episodes} progress={progress} continueList={continueList} podcastById={podcastById} onPlay={playEpisode} favorites={favorites} onFav={toggleFav} setPage={setPage} loading={loadingLibrary}/>}
        {page==='music'&&<MusicPage tracks={tracks} onPlay={playTrack} onOpen={openTrack} currentTrackId={currentTrackId} activePlayer={activePlayer} loading={loadingLibrary}/>}
        {page==='musicDetail'&&<MusicDetailPage track={tracks.find(t=>t.id===selectedTrackId)} onPlay={playTrack} onBack={()=>setPage('music')} active={activePlayer==='music'&&currentTrackId===selectedTrackId}/>}
        {page==='search'&&<SearchPage query={query} setQuery={setQuery} episodes={filtered} podcastById={podcastById} onPlay={playEpisode} favorites={favorites} onFav={toggleFav}/>}
        {page==='library'&&<LibraryPage podcasts={podcasts} episodes={episodes} progress={progress} onPlay={playEpisode} onOpen={openPodcast} loading={loadingLibrary}/>}
        {page==='podcastDetail'&&<PodcastDetailPage podcast={podcastById[selectedPodcastId]} episodes={episodes.filter(e=>e.podcast_id===selectedPodcastId)} onPlay={playEpisode} onBack={()=>setPage('library')} favorites={favorites} onFav={toggleFav}/>}
        {page==='favorites'&&<EpisodeList title="Tập đã lưu" episodes={episodes.filter(e=>favorites.includes(e.id))} podcastById={podcastById} onPlay={playEpisode} favorites={favorites} onFav={toggleFav}/>}
        {page==='history'&&<HistoryPage history={history} episodes={episodes} podcastById={podcastById} onPlay={playEpisode}/>}
        {page==='playlists'&&<PlaylistPage playlists={playlists} setPlaylists={setPlaylists} episodes={episodes} podcastById={podcastById} onPlay={playEpisode} session={session}/>}
        {page==='stats'&&<StatsPage stats={stats} podcastById={podcastById}/>}
        {page==='profile'&&<ProfilePage profile={profile} session={session} setProfile={setProfile} stats={stats} podcastById={podcastById}/>}
        {page==='podcastStudio'&&canCreate&&<CreatorStudio onPublished={loadPublicLibrary} profile={profile}/>}
        {page==='musicStudio'&&canCreate&&<MusicStudio onPublished={loadPublicLibrary} profile={profile}/>}
      </div>
    </main>

    <UnifiedPlayer
      mediaType={activePlayer}
      episode={current}
      podcast={current?podcastById[current.podcast_id]:null}
      track={currentTrack}
      saved={current?progress[current.id]:null}
      tracks={tracks}
      onProgress={saveProgress}
      onHistory={addHistory}
      onListen={recordListening}
      onPrevPodcast={previousEpisode}
      onNextPodcast={nextEpisode}
      onPrevMusic={previousTrack}
      onNextMusic={nextTrack}
      full={fullPlayer}
      setFull={setFullPlayer}
      playRequest={playRequest}
    />

    {authOpen&&<AuthModal close={()=>setAuthOpen(false)} session={session} mode={authMode} setMode={setAuthMode}/>}
    {profileOpen&&session&&<ProfileModal close={()=>setProfileOpen(false)} profile={profile} session={session} setProfile={setProfile}/>}
    {noteOpen&&current&&<NoteModal episode={current} timestamp={progress[current.id]?.current_time||0} close={()=>setNoteOpen(false)} onSave={addNote}/>}
    {toast&&<Toast text={toast} onDone={()=>setToast('')}/>}
  </div>
}

function HomePage({podcasts,episodes,progress,continueList,podcastById,onPlay,favorites,onFav,setPage,loading}){
  return <div className="page-stack">
    <section className="hero"><div className="hero-copy"><span className="pill">YOUR AUDIO SPACE</span><h2>Podcast của bạn, tiếp tục đúng nơi bạn dừng lại.</h2>
      <p>Nghe liền mạch trên máy tính và điện thoại, lưu tiến độ riêng theo tài khoản và điều khiển ngay từ Now Playing.</p>
      <button className="primary" onClick={()=>continueList[0]?onPlay(continueList[0].id):onPlay(episodes[0]?.id)}><Play size={18} fill="currentColor"/>{continueList[0]?`Nghe tiếp ${fmt(progress[continueList[0].id]?.current_time||0)}`:'Bắt đầu nghe'}</button></div>
      <div className="hero-orbit"><div className="disc"><Headphones size={48}/></div><div className="signal s1"/><div className="signal s2"/><div className="signal s3"/></div></section>

    {continueList.length>0&&<section><div className="section-head"><div><span>Đang nghe dở</span><h3>Tiếp tục đúng vị trí</h3></div><button onClick={()=>setPage('history')}>Lịch sử <ChevronRight size={16}/></button></div>
      <div className="continue-grid">{continueList.slice(0,4).map(e=>{const p=progress[e.id]||{},pod=podcastById[e.podcast_id];return <button className="continue-card" key={e.id} onClick={()=>onPlay(e.id)}>
        <img loading="lazy" decoding="async" src={pod?.image||pod?.cover_url} alt=""/><div><small>{pod?.title}</small><strong>{e.title}</strong><span>{fmt(p.current_time)} / {fmt(p.duration||e.duration)}</span><div className="progress"><i style={{width:`${p.progress_percent||0}%`}}/></div></div><Play className="round-play" size={18} fill="currentColor"/></button>})}</div></section>}

    <section><div className="section-head"><div><span>{loading?'Đang tải':'Thư viện của bạn'}</span><h3>Podcast nổi bật</h3></div></div>{loading?<LoadingCards/>:<div className="podcast-grid">{podcasts.map(p=><article className="podcast-card" key={p.id}>
      <div className="cover-wrap"><img loading="lazy" decoding="async" src={p.image||p.cover_url} alt={p.title}/><button onClick={()=>onPlay(episodes.find(e=>e.podcast_id===p.id)?.id)}><Play fill="currentColor"/></button></div>
      <small>{p.category||'Podcast'}</small><h4>{p.title}</h4><p>{p.description}</p></article>)}</div>}</section>
    {!loading&&<EpisodeList title="Tập mới nhất" episodes={episodes} podcastById={podcastById} onPlay={onPlay} favorites={favorites} onFav={onFav}/>}
  </div>
}
function LoadingCards({count=6}){return <div className="podcast-grid loading-grid" aria-label="Đang tải thư viện">{Array.from({length:count},(_,i)=><div className="skeleton-card" key={i}><span className="skeleton skeleton-cover"/><span className="skeleton skeleton-line short"/><span className="skeleton skeleton-line"/><span className="skeleton skeleton-line medium"/></div>)}</div>}
function SearchPage({query,setQuery,episodes,podcastById,onPlay,favorites,onFav}){return <div className="page-stack"><div className="searchbox"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm tên podcast, tập, chủ đề..."/></div><EpisodeList title={query?`Kết quả cho “${query}”`:'Tất cả tập'} episodes={episodes} podcastById={podcastById} onPlay={onPlay} favorites={favorites} onFav={onFav}/></div>}
function LibraryPage({podcasts=[],episodes=[],progress={},onPlay,onOpen,loading=false}){
  const [filter,setFilter]=useState('all')
  const [view,setView]=useState('grid')

  const rows=podcasts.map(p=>{
    const eps=episodes.filter(e=>e.podcast_id===p.id)
    const completed=eps.filter(e=>progress[e.id]?.completed).length
    const started=eps.filter(e=>(progress[e.id]?.current_time||0)>10).length
    const percent=eps.length?Math.round((completed/eps.length)*100):0
    return {...p,eps,completed,started,percent}
  })

  const visible=rows.filter(p=>{
    if(filter==='following') return p.started>0 && p.completed<p.eps.length
    if(filter==='completed') return p.eps.length>0 && p.completed===p.eps.length
    return true
  })

  return <div className="reference-library">
    <div className="library-heading">
      <div><h1>Thư viện Podcast</h1><p>Tất cả podcast bạn theo dõi và đã lưu</p></div>
      <div className="library-view-toggle">
        <button className={view==='grid'?'active':''} onClick={()=>setView('grid')} title="Dạng lưới"><Grid2X2 size={18}/></button>
        <button className={view==='list'?'active':''} onClick={()=>setView('list')} title="Dạng danh sách"><Rows3 size={19}/></button>
      </div>
    </div>
    <div className="library-filters">
      <button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Tất cả</button>
      <button className={filter==='following'?'active':''} onClick={()=>setFilter('following')}>Đang nghe</button>
      <button className={filter==='completed'?'active':''} onClick={()=>setFilter('completed')}>Đã hoàn thành</button>
    </div>

    {loading?<LoadingCards count={4}/>:<div className={`reference-podcast-grid ${view==='list'?'list-view':''}`}>
      {visible.length?visible.map(p=>{
        const first=p.eps.find(e=>!progress[e.id]?.completed)||p.eps[0]
        return <article className="reference-podcast-card" key={p.id}>
          <button className="reference-cover-button" onClick={()=>onOpen(p.id)}>
            <img loading="lazy" decoding="async" src={p.image||p.cover_url} alt={p.title}/>
            <span className="episode-count">{p.eps.length}</span>
          </button>
          <div className="reference-card-body">
            <button className="reference-card-title" onClick={()=>onOpen(p.id)}>{p.title}</button>
            <p>{p.description||'Chưa có mô tả.'}</p>
            <div className="reference-progress"><span style={{width:`${p.percent}%`}}/></div>
            <div className="reference-card-footer">
              <small>{p.completed}/{p.eps.length} tập</small>
              <button className="card-more" title="Phát Podcast" disabled={!first} onClick={()=>first&&onPlay(first.id)}><Play size={15} fill="currentColor"/></button>
            </div>
          </div>
        </article>
      }):<div className="empty reference-empty">Chưa có Podcast phù hợp bộ lọc này.</div>}
    </div>}
  </div>
}

function PodcastDetailPage({podcast,episodes,onPlay,onBack,favorites,onFav}){
  if(!podcast)return <div className="empty">Không tìm thấy Podcast.</div>
  return <div className="podcast-detail-page page-stack">
    <button className="detail-back" onClick={onBack}>‹ Quay lại thư viện</button>
    <section className="podcast-detail-hero">
      <img className="podcast-detail-cover" src={podcast.image||podcast.cover_url} alt={podcast.title}/>
      <div className="podcast-detail-copy"><span className="eyebrow">PODCAST</span><h2>{podcast.title}</h2><p>{podcast.description||'Chưa có mô tả.'}</p><div className="podcast-detail-meta"><span>{episodes.length} tập</span><span>•</span><span>{podcast.author||'Podcast Vault'}</span></div>
      <button className="primary fit" disabled={!episodes[0]} onClick={()=>episodes[0]&&onPlay(episodes[0].id)}><Play size={17} fill="currentColor"/> Phát từ đầu</button></div>
    </section>
    <EpisodeList title="Tất cả tập" episodes={episodes} podcastById={{[podcast.id]:podcast}} onPlay={onPlay} favorites={favorites} onFav={onFav}/>
  </div>
}
function EpisodeList({title,episodes,podcastById,onPlay,favorites=[],onFav=(_id)=>{}}){return <section><div className="section-head"><div><span>Danh sách</span><h3>{title}</h3></div></div><div className="episode-list">{episodes.length?episodes.map(e=>{const p=podcastById[e.podcast_id];return <article className="episode-row" key={e.id}><button className="episode-play" onClick={()=>onPlay(e.id)} aria-label={`Phát ${e.title}`}><Play size={17} fill="currentColor"/></button><img loading="lazy" decoding="async" src={p?.image||p?.cover_url} alt=""/><div className="episode-main"><small>{p?.title}</small><strong>{e.title}</strong><p>{e.description}</p></div><span className="duration"><Clock3 size={14}/>{fmt(e.duration)}</span><button className={`icon-btn ${favorites.includes(e.id)?'liked':''}`} onClick={()=>onFav(e.id)} aria-label={favorites.includes(e.id)?'Bỏ yêu thích':'Thêm vào yêu thích'}><Heart size={18} fill={favorites.includes(e.id)?'currentColor':'none'}/></button></article>}):<div className="empty">Chưa có tập nào ở đây.</div>}</div></section>}
function HistoryPage({history,episodes,podcastById,onPlay}){const rows=history.map(h=>({...h,episode:episodes.find(e=>e.id===h.episode_id)})).filter(x=>x.episode);return <section><div className="section-head"><div><span>Gần đây</span><h3>Lịch sử nghe</h3></div></div><div className="episode-list">{rows.length?rows.map(r=><article className="episode-row" key={r.id}><button className="episode-play" onClick={()=>onPlay(r.episode.id)}><Play size={17}/></button><img src={podcastById[r.episode.podcast_id]?.image||podcastById[r.episode.podcast_id]?.cover_url} alt=""/><div className="episode-main"><small>{new Date(r.listened_at).toLocaleString('vi-VN')}</small><strong>{r.episode.title}</strong></div></article>):<div className="empty">Bạn chưa nghe tập nào.</div>}</div></section>}
function PlaylistPage({playlists,setPlaylists,episodes,podcastById,onPlay,session}){
  const [selectedId,setSelectedId]=useState(null)
  const [pickerOpen,setPickerOpen]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const selected=playlists.find(p=>p.id===selectedId)||null

  const create=async()=>{
    const name=prompt('Tên playlist mới?')
    if(!name?.trim())return
    setBusy(true);setMessage('')
    try{
      let item={id:crypto.randomUUID(),name:name.trim(),episode_ids:[]}
      if(supabaseReady&&session?.user){
        const {data,error}=await supabase.from('playlists').insert({user_id:session.user.id,name:name.trim()}).select().single()
        if(error)throw error
        item={...data,episode_ids:[]}
      }
      setPlaylists(prev=>[item,...prev])
      setSelectedId(item.id)
    }catch(err){setMessage(err.message)}finally{setBusy(false)}
  }

  const rename=async pl=>{
    const name=prompt('Đổi tên playlist:',pl.name)
    if(!name?.trim()||name.trim()===pl.name)return
    setBusy(true);setMessage('')
    try{
      if(supabaseReady&&session?.user){
        const {error}=await supabase.from('playlists').update({name:name.trim()}).eq('id',pl.id)
        if(error)throw error
      }
      setPlaylists(prev=>prev.map(x=>x.id===pl.id?{...x,name:name.trim()}:x))
    }catch(err){setMessage(err.message)}finally{setBusy(false)}
  }

  const removePlaylist=async pl=>{
    if(!confirm(`Xóa playlist “${pl.name}”?`))return
    setBusy(true);setMessage('')
    try{
      if(supabaseReady&&session?.user){
        const {error}=await supabase.from('playlists').delete().eq('id',pl.id)
        if(error)throw error
      }
      setPlaylists(prev=>prev.filter(x=>x.id!==pl.id))
      setSelectedId(null)
    }catch(err){setMessage(err.message)}finally{setBusy(false)}
  }

  const addEpisode=async episodeId=>{
    if(!selected||selected.episode_ids.includes(episodeId))return
    setBusy(true);setMessage('')
    try{
      const position=selected.episode_ids.length
      if(supabaseReady&&session?.user){
        const {error}=await supabase.from('playlist_episodes').insert({playlist_id:selected.id,episode_id:episodeId,position})
        if(error)throw error
      }
      setPlaylists(prev=>prev.map(pl=>pl.id===selected.id?{...pl,episode_ids:[...pl.episode_ids,episodeId]}:pl))
      setMessage('Đã thêm tập vào playlist.')
    }catch(err){setMessage(err.message)}finally{setBusy(false)}
  }

  const removeEpisode=async episodeId=>{
    if(!selected)return
    setBusy(true);setMessage('')
    try{
      if(supabaseReady&&session?.user){
        const {error}=await supabase.from('playlist_episodes').delete().eq('playlist_id',selected.id).eq('episode_id',episodeId)
        if(error)throw error
      }
      setPlaylists(prev=>prev.map(pl=>pl.id===selected.id?{...pl,episode_ids:pl.episode_ids.filter(id=>id!==episodeId)}:pl))
    }catch(err){setMessage(err.message)}finally{setBusy(false)}
  }

  const playAll=()=>{
    const first=selected?.episode_ids?.[0]
    if(first)onPlay(first)
  }

  if(selected){
    const selectedEpisodes=selected.episode_ids.map(id=>episodes.find(e=>e.id===id)).filter(Boolean)
    const available=episodes.filter(e=>!selected.episode_ids.includes(e.id))
    return <div className="playlist-detail page-stack">
      <div className="playlist-detail-head">
        <button className="playlist-back" onClick={()=>{setSelectedId(null);setPickerOpen(false)}}>← Playlist</button>
        <div className="playlist-detail-title"><div className="playlist-detail-art"><ListMusic size={34}/></div><div><span>PLAYLIST PODCAST</span><h2>{selected.name}</h2><p>{selectedEpisodes.length} tập</p></div></div>
        <div className="playlist-actions"><button className="primary" onClick={playAll} disabled={!selectedEpisodes.length}><Play size={17} fill="currentColor"/> Phát tất cả</button><button className="ghost" onClick={()=>setPickerOpen(!pickerOpen)}><Plus size={16}/> Thêm tập</button><button className="ghost" onClick={()=>rename(selected)}>Đổi tên</button><button className="danger" onClick={()=>removePlaylist(selected)}><Trash2 size={15}/> Xóa</button></div>
      </div>

      {pickerOpen&&<section className="playlist-picker"><div className="section-head"><div><span>THƯ VIỆN</span><h3>Thêm tập vào playlist</h3></div><button onClick={()=>setPickerOpen(false)}><X size={17}/></button></div>
        <div className="playlist-picker-list">{available.length?available.map(e=>{const p=podcastById[e.podcast_id];return <div className="playlist-picker-row" key={e.id}><img src={p?.image||p?.cover_url} alt=""/><div><small>{p?.title}</small><strong>{e.title}</strong></div><button className="ghost" disabled={busy} onClick={()=>addEpisode(e.id)}><Plus size={15}/> Thêm</button></div>}):<div className="empty">Tất cả tập đã nằm trong playlist.</div>}</div>
      </section>}

      <section><div className="section-head"><div><span>DANH SÁCH PHÁT</span><h3>{selected.name}</h3></div></div>
        <div className="playlist-episode-list">{selectedEpisodes.length?selectedEpisodes.map((e,index)=>{const p=podcastById[e.podcast_id];return <div className="playlist-episode-row" key={e.id}><span className="playlist-number">{index+1}</span><button className="episode-play" onClick={()=>onPlay(e.id)}><Play size={16} fill="currentColor"/></button><img src={p?.image||p?.cover_url} alt=""/><div className="playlist-episode-info"><small>{p?.title}</small><strong>{e.title}</strong></div><span className="duration"><Clock3 size={14}/>{fmt(e.duration)}</span><button className="icon-btn danger-icon" title="Xóa khỏi playlist" onClick={()=>removeEpisode(e.id)}><X size={17}/></button></div>}):<div className="playlist-empty-state"><ListMusic size={34}/><strong>Playlist đang trống</strong><p>Bấm “Thêm tập” để chọn Podcast bạn muốn nghe sau.</p><button className="primary fit" onClick={()=>setPickerOpen(true)}><Plus size={16}/> Thêm tập đầu tiên</button></div>}</div>
      </section>
      {message&&<div className="studio-msg"><CheckCircle2 size={17}/>{message}</div>}
    </div>
  }

  return <div className="page-stack">
    <div className="playlist-page-head"><div><span>PLAYLIST PODCAST</span><h2>Playlist của bạn</h2><p>Tạo danh sách nghe riêng và mở lại bất cứ lúc nào.</p></div><button className="primary fit" disabled={busy} onClick={create}><Plus size={17}/> Tạo playlist</button></div>
    {message&&<div className="studio-msg"><CheckCircle2 size={17}/>{message}</div>}
    <div className="playlist-grid">{playlists.length?playlists.map(pl=><button className="playlist-card playlist-card-button" key={pl.id} onClick={()=>setSelectedId(pl.id)}><div className="playlist-art"><ListMusic size={34}/></div><small>{pl.episode_ids?.length||0} tập</small><h4>{pl.name}</h4><span className="playlist-open">Mở playlist <ChevronRight size={15}/></span></button>):<div className="playlist-empty-state playlist-empty-wide"><ListMusic size={40}/><strong>Chưa có playlist nào</strong><p>Tạo playlist đầu tiên để lưu các tập Podcast bạn muốn nghe.</p><button className="primary fit" onClick={create}><Plus size={16}/> Tạo playlist</button></div>}</div>
  </div>
}

function MusicPage({tracks,onPlay,onOpen,currentTrackId,activePlayer,loading=false}){
  const fmtDate=value=>{if(!value)return '—';try{return new Date(value).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})}catch{return '—'}}
  return <div className="page-stack music-library-page">
    <section className="music-library-head"><div><span className="eyebrow">Thư viện âm nhạc</span><h2>Âm nhạc</h2><p>{tracks.length} bài hát trong thư viện</p></div></section>
    <section className="music-table-wrap">
      <div className="music-table-header"><span className="col-index">#</span><span className="col-title">Title</span><span className="col-album">Album</span><span className="col-date">Date added</span><span className="col-duration"><Clock3 size={16}/></span></div>
      <div className="music-table-body">
        {loading?<div className="music-loading" aria-label="Đang tải âm nhạc">{Array.from({length:5},(_,i)=><div className="music-row-skeleton" key={i}><span className="skeleton skeleton-number"/><span className="skeleton skeleton-track"/><span className="skeleton skeleton-meta"/></div>)}</div>:tracks.length?tracks.map((t,index)=>{const isPlaying=currentTrackId===t.id&&activePlayer==='music';return <div className={`music-row ${isPlaying?'is-playing':''}`} key={t.id} onDoubleClick={()=>t.audio_url&&onPlay(t.id)}>
          <button type="button" className="track-index-wrap" onClick={()=>t.audio_url&&onPlay(t.id)} aria-label={`Phát ${t.title}`}><span className="track-index">{index+1}</span><span className="row-play">{isPlaying?<Pause size={15} fill="currentColor"/>:<Play size={15} fill="currentColor"/>}</span></button>
          <button type="button" className="music-title-cell music-open-button" onClick={()=>onOpen(t.id)}><span className="music-thumb">{t.cover_url?<img loading="lazy" decoding="async" src={t.cover_url} alt=""/>:<Music2 size={18}/>}</span><span className="music-title-text"><strong>{t.title}</strong><small>{t.artist||'Unknown artist'}</small></span></button>
          <span className="music-album">{t.album||'—'}</span><span className="music-date">{fmtDate(t.created_at)}</span><span className="music-duration">{t.duration?fmt(Number(t.duration)):'—'}</span>
        </div>}):<div className="empty music-empty">Chưa có bài nhạc nào. Admin có thể thêm trong Music Studio.</div>}
      </div>
    </section>
  </div>
}

function MusicDetailPage({track,onPlay,onBack,active}){
  if(!track)return <div className="empty">Không tìm thấy bài nhạc.</div>
  return <div className="music-detail-page">
    <button className="detail-back" onClick={onBack}>← Quay lại Âm nhạc</button>
    <section className="music-detail-hero">
      <div className="music-detail-cover">{track.cover_url?<img src={track.cover_url} alt={track.title}/>:<Disc3 size={72}/>}</div>
      <div className="music-detail-copy"><span className="eyebrow">BÀI HÁT</span><h2>{track.title}</h2><p>{track.artist||'Unknown artist'}{track.album?` • ${track.album}`:''}</p><div className="music-detail-meta"><span>{track.duration?fmt(Number(track.duration)):'Chưa có thời lượng'}</span><span>{track.created_at?new Date(track.created_at).toLocaleDateString('vi-VN'):''}</span></div>{track.audio_url?<button className="primary music-detail-play" onClick={()=>onPlay(track.id)}><Play size={19} fill="currentColor"/>{active?'Phát lại từ vị trí hiện tại':'Phát bài hát'}</button>:<p className="muted">Bài này chưa có file audio trực tiếp.</p>}</div>
    </section>
  </div>
}

function UnifiedPlayer({mediaType,episode,podcast,track,saved,tracks,onProgress,onHistory,onListen,onPrevPodcast,onNextPodcast,onPrevMusic,onNextMusic,full,setFull,playRequest}){
  const audioRef=useRef(null)
  const mediaKeyRef=useRef('')
  const lastTimeRef=useRef(0)
  const listenBufferRef=useRef(0)
  const lastProgressSaveRef=useRef(0)
  const retryRef=useRef(0)
  const stallTimerRef=useRef(null)
  const wasPlayingRef=useRef(false)
  const switchingRef=useRef(false)
  const lastUiTickRef=useRef(0)
  const [playing,setPlaying]=useState(false)
  const [time,setTime]=useState(0)
  const [duration,setDuration]=useState(0)
  const [buffering,setBuffering]=useState(false)
  const [errorText,setErrorText]=useState('')
  const [volume,setVolume]=useState(()=>Number(readLocal().masterVolume??0.85))
  const [repeatMode,setRepeatMode]=useState(()=>readLocal().repeatMode||'all')
  const [playbackRate,setPlaybackRate]=useState(()=>Number(readLocal().playbackRate)||1)

  const isMusic=mediaType==='music'
  const media=isMusic?track:episode
  const src=isMusic?track?.audio_url:episode?.audio_url
  const mediaId=media?.id
  const title=isMusic?track?.title:episode?.title
  const subtitle=isMusic?(track?.artist||'Unknown artist'):(podcast?.title||'Podcast')
  const cover=isMusic?track?.cover_url:(podcast?.image||podcast?.cover_url)
  const key=mediaId?`${mediaType}:${mediaId}`:''
  const nextHandler=isMusic?onNextMusic:onNextPodcast
  const prevHandler=isMusic?onPrevMusic:onPrevPodcast

  const flushListening=useCallback(()=>{
    const seconds=Math.floor(listenBufferRef.current)
    if(seconds>0&&mediaId){listenBufferRef.current-=seconds;onListen?.(mediaType,mediaId,seconds)}
  },[mediaType,mediaId,onListen])

  const persistPosition=useCallback(()=>{
    const a=audioRef.current;if(!a||!mediaId)return
    const local=readLocal(),positions={...(local.mediaPositions||{}),[key]:a.currentTime||0}
    writeLocal({...local,mediaPositions:positions,masterVolume:volume})
    if(!isMusic&&episode)onProgress?.(episode,a.currentTime,a.duration||episode.duration||0,(a.duration||0)>0&&a.currentTime/a.duration>.95)
  },[mediaId,key,volume,isMusic,episode,onProgress])

  useEffect(()=>{
    const a=audioRef.current
    if(!a||!src||!key)return
    switchingRef.current=true
    retryRef.current=0
    listenBufferRef.current=0
    setErrorText('');setBuffering(true)
    a.pause()
    mediaKeyRef.current=key
    let resume=0
    if(!isMusic)resume=Number(saved?.current_time||0)
    else resume=Number(readLocal().mediaPositions?.[key]||0)
    const ready=()=>{
      setDuration(a.duration||Number(media?.duration)||0)
      if(resume>0&&resume<(a.duration||Infinity)-2){try{a.currentTime=resume}catch{}}
      lastTimeRef.current=a.currentTime||resume||0
      setTime(a.currentTime||resume||0)
      setBuffering(false)
      switchingRef.current=false
      if(isMusic&&media?.id&&(!media.duration||Math.abs(Number(media.duration)-a.duration)>1)&&supabaseReady){supabase.from('music_tracks').update({duration:a.duration}).eq('id',media.id).then(()=>{})}
    }
    a.addEventListener('loadedmetadata',ready,{once:true})
    a.src=src
    a.preload='auto'
    a.playbackRate=playbackRate
    a.load()
    // Start fetching/playing immediately. Waiting for all metadata first can make
    // large MP3/M4A files feel slow, especially when the server has a cold cache.
    a.play().then(()=>{
      setPlaying(true);wasPlayingRef.current=true
      if(!isMusic&&episode)onHistory?.(episode)
    }).catch(()=>{
      setPlaying(false)
      switchingRef.current=false
      setBuffering(false)
    })
    return()=>{
      clearTimeout(stallTimerRef.current)
      a.removeEventListener('loadedmetadata',ready)
      const seconds=Math.floor(listenBufferRef.current)
      if(seconds>0&&mediaId){listenBufferRef.current-=seconds;onListen?.(mediaType,mediaId,seconds)}
      const local=readLocal(),positions={...(local.mediaPositions||{}),[key]:a.currentTime||0}
      writeLocal({...local,mediaPositions:positions,masterVolume:a.volume})
      if(!isMusic&&episode)onProgress?.(episode,a.currentTime,a.duration||episode.duration||0,(a.duration||0)>0&&a.currentTime/a.duration>.95)
    }
  },[key,src])

  useEffect(()=>{const a=audioRef.current;if(a)a.volume=volume;writeLocal({...readLocal(),masterVolume:volume})},[volume])
  useEffect(()=>{writeLocal({...readLocal(),repeatMode})},[repeatMode])
  useEffect(()=>{const a=audioRef.current;if(a)a.playbackRate=playbackRate;writeLocal({...readLocal(),playbackRate})},[playbackRate])
  useEffect(()=>{if(playRequest>0&&audioRef.current&&media){audioRef.current.play().catch(()=>{})}},[playRequest])

  useEffect(()=>{
    if(!media||!('mediaSession' in navigator))return
    try{
      navigator.mediaSession.metadata=new MediaMetadata({title:title||'Đang phát',artist:subtitle||'Podcast Vault',album:isMusic?(track?.album||'Âm nhạc'):'Podcast',artwork:cover?[{src:cover,sizes:'512x512'}]:[]})
      navigator.mediaSession.setActionHandler('play',()=>audioRef.current?.play())
      navigator.mediaSession.setActionHandler('pause',()=>audioRef.current?.pause())
      navigator.mediaSession.setActionHandler('previoustrack',()=>prevHandler?.())
      navigator.mediaSession.setActionHandler('nexttrack',()=>nextHandler?.())
      navigator.mediaSession.setActionHandler('seekbackward',d=>{if(audioRef.current)audioRef.current.currentTime=Math.max(0,audioRef.current.currentTime-(d.seekOffset||15))})
      navigator.mediaSession.setActionHandler('seekforward',d=>{if(audioRef.current)audioRef.current.currentTime=Math.min(audioRef.current.duration||Infinity,audioRef.current.currentTime+(d.seekOffset||30))})
      navigator.mediaSession.setActionHandler('seekto',d=>{if(audioRef.current&&Number.isFinite(d.seekTime))audioRef.current.currentTime=d.seekTime})
    }catch{}
  },[key,title,subtitle,cover,isMusic,track?.album,prevHandler,nextHandler])


  useEffect(()=>{
    const handler=()=>{persistPosition();flushListening()}
    document.addEventListener('visibilitychange',handler)
    window.addEventListener('pagehide',handler)
    return()=>{document.removeEventListener('visibilitychange',handler);window.removeEventListener('pagehide',handler)}
  },[persistPosition,flushListening])

  const handleTime=()=>{
    const a=audioRef.current;if(!a)return
    const now=a.currentTime||0,delta=now-lastTimeRef.current
    if(!a.paused&&delta>0&&delta<5)listenBufferRef.current+=delta
    lastTimeRef.current=now
    const stamp=performance.now()
    if(stamp-lastUiTickRef.current>=250){
      lastUiTickRef.current=stamp
      setTime(now)
      if('mediaSession' in navigator&&Number.isFinite(a.duration)&&a.duration>0){try{navigator.mediaSession.setPositionState({duration:a.duration,playbackRate:a.playbackRate||1,position:Math.min(now,a.duration)})}catch{}}
    }
    if(listenBufferRef.current>=30)flushListening()
    if(!isMusic&&episode&&Math.abs(now-lastProgressSaveRef.current)>=8){lastProgressSaveRef.current=now;onProgress?.(episode,now,a.duration||episode.duration||0,(a.duration||0)>0&&now/a.duration>.95)}
  }

  const recover=()=>{
    const a=audioRef.current;if(!a||!src||retryRef.current>=2)return
    const resume=a.currentTime||lastTimeRef.current||0,shouldPlay=wasPlayingRef.current
    retryRef.current+=1;setBuffering(true);setErrorText('Đang thử nối lại âm thanh…')
    setTimeout(()=>{if(!audioRef.current||mediaKeyRef.current!==key)return;const x=audioRef.current;const restored=()=>{if(resume>0&&resume<(x.duration||Infinity)-1)x.currentTime=resume;x.playbackRate=playbackRate;setBuffering(false);setErrorText('');if(shouldPlay)x.play().catch(()=>{})};x.addEventListener('loadedmetadata',restored,{once:true});x.src=src;x.preload='auto';x.load()},900)
  }

  const bufferedAhead=()=>{
    const a=audioRef.current
    if(!a)return 0
    for(let i=0;i<a.buffered.length;i++){
      if(a.buffered.start(i)<=a.currentTime+.25&&a.buffered.end(i)>=a.currentTime)return a.buffered.end(i)-a.currentTime
    }
    return 0
  }
  const clearStallTimer=()=>{clearTimeout(stallTimerRef.current);stallTimerRef.current=null}
  const handleCanPlay=()=>{clearStallTimer();setBuffering(false);setErrorText('')}
  const handleProgress=()=>{
    const a=audioRef.current
    if(a&&(a.readyState>=HTMLMediaElement.HAVE_FUTURE_DATA||bufferedAhead()>5))handleCanPlay()
  }
  const handleWaiting=()=>{
    setBuffering(true)
    clearStallTimer()
    stallTimerRef.current=setTimeout(()=>{
      const a=audioRef.current
      if(a&&mediaKeyRef.current===key&&a.readyState<HTMLMediaElement.HAVE_FUTURE_DATA)recover()
    },7000)
  }
  const handleStalled=()=>{
    const a=audioRef.current
    // `stalled` only means the network stopped transferring. It is harmless when
    // the browser already buffered enough audio, so do not show a false spinner.
    if(a&&a.readyState<HTMLMediaElement.HAVE_FUTURE_DATA&&bufferedAhead()<1)handleWaiting()
  }

  const toggle=()=>{const a=audioRef.current;if(!a||!media)return;if(a.paused){a.play().catch(()=>{})}else a.pause()}
  const seekBy=n=>{const a=audioRef.current;if(a)a.currentTime=Math.max(0,Math.min(a.duration||0,a.currentTime+n))}
  const seek=e=>{const a=audioRef.current;if(a){a.currentTime=Number(e.target.value);lastTimeRef.current=a.currentTime}}
  const cycleRepeat=()=>setRepeatMode(m=>m==='off'?'all':m==='all'?'one':'off')
  const cyclePlaybackRate=()=>setPlaybackRate(rate=>rate>=2?0.75:rate<1?1:rate<1.25?1.25:rate<1.5?1.5:2)
  const onEnded=()=>{
    flushListening();persistPosition();setPlaying(false);wasPlayingRef.current=false
    const a=audioRef.current
    if(repeatMode==='one'&&a){a.currentTime=0;a.play().catch(()=>{});return}
    if(repeatMode==='all'){nextHandler?.();return}
    if(a){a.currentTime=0;setTime(0)}
  }

  if(!media)return <div className="player"><div className="player-placeholder"><Headphones size={18}/> Chưa có nội dung đang phát.</div></div>

  const core=<>
    <div className="now unified-now"><div className="music-now-cover">{cover?<img src={cover} alt=""/>:(isMusic?<Disc3 size={22}/>:<Headphones size={22}/>)}</div><div><span className={`now-type ${isMusic?'music-type':'podcast-type'}`}>{isMusic?<Music2 size={12}/>:<Headphones size={12}/>} {isMusic?'ÂM NHẠC':'PODCAST'}</span><strong>{title}</strong><span className="music-artist">{subtitle}</span></div>{buffering?<LoaderCircle className="buffer-spin" size={18}/>:null}</div>
    <div className="controls"><div className="control-row music-main-controls"><button title="Trước" onClick={()=>prevHandler?.()}><SkipBack size={21}/></button><button className="play-main" onClick={toggle}>{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button><button title="Tiếp" onClick={()=>nextHandler?.()}><SkipForward size={21}/></button></div><div className="timeline"><span>{fmt(time)}</span><input type="range" min="0" max={duration||1} value={Math.min(time,duration||1)} onChange={seek}/><span>{fmt(duration)}</span></div></div>
    <div className="extras"><button title="Tua lại" onClick={()=>seekBy(isMusic?-10:-15)}><RotateCcw size={17}/></button><button className="speed-btn" title="Tốc độ phát" onClick={cyclePlaybackRate}>{playbackRate}×</button><button className={`repeat-btn ${repeatMode!=='off'?'active':''}`} title={repeatMode==='off'?'Lặp: Tắt':repeatMode==='all'?'Lặp tất cả':'Lặp 1 bài/tập'} onClick={cycleRepeat}><Repeat2 size={18}/>{repeatMode==='one'?<span className="repeat-one">1</span>:null}</button><Volume2 size={17}/><input className="volume" type="range" min="0" max="1" step=".05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div>
  </>
  return <><div className="player unified-player"><audio ref={audioRef} playsInline preload="auto" onTimeUpdate={handleTime} onProgress={handleProgress} onPlay={()=>{setPlaying(true);wasPlayingRef.current=true;if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing'}} onPlaying={handleCanPlay} onPause={()=>{setPlaying(false);if(!switchingRef.current){flushListening();persistPosition()}if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused'}} onWaiting={handleWaiting} onCanPlay={handleCanPlay} onStalled={handleStalled} onError={()=>{clearStallTimer();setErrorText('Mất kết nối âm thanh.');recover()}} onEnded={onEnded}/><button className="mobile-expand" onClick={()=>setFull(true)} aria-label="Mở trình phát đầy đủ"></button>{core}{errorText?<div className="player-error">{errorText}</div>:null}</div>
    {full&&<div className="full-player"><div className="full-head"><button onClick={()=>setFull(false)} aria-label="Thu nhỏ trình phát"><ChevronDown/></button><span>{isMusic?'ĐANG PHÁT NHẠC':'ĐANG PHÁT PODCAST'}</span><button aria-label="Tùy chọn khác" disabled><MoreHorizontal/></button></div><div className="full-cover">{cover?<img src={cover} alt=""/>:<div className="full-cover-fallback">{isMusic?<Disc3 size={72}/>:<Headphones size={72}/>}</div>}</div>{core}</div>}
  </>
}

function QueuePanel({queue,episodes,podcastById,onPlay,setQueue}){
  const move=(idx,dir)=>{
    const next=[...queue], j=idx+dir
    if(j<0||j>=next.length)return
    ;[next[idx],next[j]]=[next[j],next[idx]]
    setQueue(next)
  }
  return <section className="queue-panel"><div className="queue-head"><div><span>Tiếp theo</span><h3>Nghe tiếp theo</h3></div>{queue.length>0&&<button onClick={()=>setQueue([])}>Xóa tất cả</button>}</div>
    {queue.length?queue.map((id,idx)=>{const e=episodes.find(x=>x.id===id),p=e?podcastById[e.podcast_id]:null;return e?<div className="queue-row" key={id}>
      <button className="queue-play" onClick={()=>onPlay(id)}><Play size={15}/></button>
      <img src={p?.image||p?.cover_url} alt=""/><div><small>{p?.title}</small><strong>{e.title}</strong></div>
      <button onClick={()=>move(idx,-1)}><ArrowUp size={15}/></button><button onClick={()=>move(idx,1)}><ArrowDown size={15}/></button><button onClick={()=>setQueue(q=>q.filter(x=>x!==id))}><Trash2 size={15}/></button>
    </div>:null}):<div className="empty">Queue đang trống. Khi hết tập hiện tại, app sẽ tự phát tập tiếp theo của podcast nếu có.</div>}
  </section>
}

function StatsPage({stats,podcastById}){
  const hours=(stats.totalSeconds/3600).toFixed(stats.totalSeconds>=36000?0:1)
  const top=podcastById[stats.topPodcastId]
  return <div className="stats-grid">
    <article className="stat-card"><div className="stat-icon"><Clock3/></div><small>Tổng thời gian nghe</small><strong>{hours} giờ</strong><p>Tổng thời gian đã nghe trên tài khoản này.</p></article>
    <article className="stat-card"><div className="stat-icon"><CheckCircle2/></div><small>Tập hoàn thành</small><strong>{stats.completed}</strong><p>Tập được tính hoàn thành khi nghe trên 95%.</p></article>
    <article className="stat-card"><div className="stat-icon"><Flame/></div><small>Listening Streak</small><strong>{stats.streak} ngày</strong><p>Chuỗi ngày gần nhất bạn có hoạt động nghe.</p></article>
    <article className="stat-card wide-stat"><div className="stat-icon"><Trophy/></div><small>Podcast nghe nhiều nhất</small><strong>{top?.title||'Chưa đủ dữ liệu'}</strong><p>{top?.description||'Nghe thêm vài tập để Podcast Vault tìm ra podcast bạn nghe nhiều nhất.'}</p></article>
  </div>
}

function ProfilePage({profile,session,setProfile,stats,podcastById}){
  const [name,setName]=useState(profile?.display_name||'')
  const [bio,setBio]=useState(profile?.bio||'')
  const [saving,setSaving]=useState(false)
  const [msg,setMsg]=useState('')
  useEffect(()=>{setName(profile?.display_name||'');setBio(profile?.bio||'')},[profile?.display_name,profile?.bio])
  const save=async()=>{
    if(!supabaseReady||!session?.user)return
    setSaving(true);setMsg('')
    const {data,error}=await supabase.from('profiles').update({display_name:name.trim(),bio:bio.trim()}).eq('id',session.user.id).select().single()
    setSaving(false)
    if(error)setMsg(error.message);else{setProfile(data);setMsg('Đã cập nhật hồ sơ.')}
  }
  const top=podcastById[stats.topPodcastId]
  const initials=(name||session.user.email||'U').slice(0,2).toUpperCase()
  return <div className="profile-page page-stack">
    <section className="profile-hero-card">
      <div className="profile-big-avatar">{profile?.avatar_url?<img src={profile.avatar_url} alt=""/>:<span>{initials}</span>}</div>
      <div className="profile-hero-copy"><span className="profile-role-badge">{profile?.role||'listener'}</span><h2>{name||'Người nghe Podcast'}</h2><p>{session.user.email}</p><small>Tham gia {session.user.created_at?new Date(session.user.created_at).toLocaleDateString('vi-VN'):'—'}</small></div>
    </section>
    <section className="profile-stat-strip"><div><strong>{(stats.totalSeconds/3600).toFixed(1)}</strong><span>giờ nghe</span></div><div><strong>{stats.completed}</strong><span>tập hoàn thành</span></div><div><strong>{stats.streak}</strong><span>ngày streak</span></div><div><strong>{top?.title||'—'}</strong><span>podcast yêu thích</span></div></section>
    <section className="profile-edit-card"><div className="section-head"><div><span>THÔNG TIN CÁ NHÂN</span><h3>Chỉnh sửa hồ sơ</h3></div></div><div className="profile-form-grid"><label>Tên hiển thị<input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên của bạn"/></label><label>Email<input value={session.user.email||''} disabled/></label><label className="profile-bio-field">Giới thiệu<textarea rows="5" value={bio} onChange={e=>setBio(e.target.value)} placeholder="Viết một chút về bạn..."/></label></div><button className="primary fit" disabled={saving} onClick={save}>{saving?'Đang lưu...':'Lưu thay đổi'}</button>{msg&&<p className="form-message">{msg}</p>}</section>
  </div>
}

function ProfileModal({close,profile,session,setProfile}){
  useEscapeClose(close)
  const [name,setName]=useState(profile?.display_name||'')
  const [bio,setBio]=useState(profile?.bio||'')
  const [msg,setMsg]=useState('')
  const save=async()=>{
    if(!supabaseReady)return
    const {data,error}=await supabase.from('profiles').update({display_name:name,bio}).eq('id',session.user.id).select().single()
    if(error)setMsg(error.message)
    else{setProfile(data);setMsg('Đã lưu hồ sơ.')}
  }
  return <div className="modal-backdrop"><div className="modal">
    <button className="close" onClick={close} aria-label="Đóng"><X/></button>
    <div className="profile-avatar"><UserCircle2 size={44}/></div>
    <h3>Hồ sơ của bạn</h3><p className="muted">{session.user.email}</p>
    <label>Tên hiển thị<input value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Giới thiệu<textarea rows="4" value={bio} onChange={e=>setBio(e.target.value)} placeholder="Một chút về bạn..."/></label>
    <div className="profile-role">Vai trò: <strong>{profile?.role||'listener'}</strong></div>
    <button className="primary wide" onClick={save}>Lưu hồ sơ</button>{msg&&<p className="form-message">{msg}</p>}
  </div></div>
}


function storagePath(bucket,url){
  if(!url)return null
  const marker=`/storage/v1/object/public/${bucket}/`
  const i=url.indexOf(marker)
  return i>=0?decodeURIComponent(url.slice(i+marker.length)):null
}

function MusicStudio({onPublished,profile}){
  const [tracks,setTracks]=useState([])
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const [form,setForm]=useState({title:'',artist:'',youtube_url:'',audio:null,cover:null})

  const load=async()=>{
    const {data,error}=await supabase.from('music_tracks').select('*').order('created_at',{ascending:false})
    if(error)setMsg(error.message); else setTracks(data||[])
  }
  useEffect(()=>{load()},[])

  const upload=async(bucket,file,prefix)=>{
    const ext=file.name.split('.').pop()
    const path=`${prefix}/${crypto.randomUUID()}.${ext}`
    const {error}=await supabase.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type||undefined,cacheControl:'31536000'})
    if(error)throw error
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const add=async e=>{
    e.preventDefault()
    if(!form.audio&&!form.youtube_url.trim()){setMsg('Chọn file MP3/M4A hoặc nhập link YouTube.');return}
    setBusy(true);setMsg('')
    try{
      let audioUrl='',coverUrl=''
      if(form.audio)audioUrl=await upload('music-audio',form.audio,'tracks')
      if(form.cover)coverUrl=await upload('music-covers',form.cover,'covers')
      const {error}=await supabase.from('music_tracks').insert({
        owner_id:profile.id,title:form.title,artist:form.artist,
        audio_url:audioUrl||null,youtube_url:form.youtube_url.trim()||null,
        cover_url:coverUrl||null,source_type:form.audio?'uploaded':'youtube',published:true
      })
      if(error)throw error
      setForm({title:'',artist:'',youtube_url:'',audio:null,cover:null})
      setMsg('Đã thêm bài nhạc.')
      await load();await onPublished()
    }catch(err){setMsg(err.message)}finally{setBusy(false)}
  }

  const edit=async t=>{
    const title=prompt('Tên bài nhạc:',t.title)
    if(title===null)return
    const artist=prompt('Ca sĩ / Artist:',t.artist||'')
    if(artist===null)return
    const {error}=await supabase.from('music_tracks').update({title:title.trim()||t.title,artist:artist.trim()}).eq('id',t.id)
    setMsg(error?error.message:'Đã cập nhật bài nhạc.')
    if(!error){await load();await onPublished()}
  }

  const remove=async t=>{
    if(!confirm(`Xóa bài "${t.title}"? File audio/cover cũng sẽ được xóa khỏi Storage nếu có.`))return
    setBusy(true);setMsg('')
    try{
      const {error}=await supabase.from('music_tracks').delete().eq('id',t.id)
      if(error)throw error
      const ap=storagePath('music-audio',t.audio_url),cp=storagePath('music-covers',t.cover_url)
      if(ap)await supabase.storage.from('music-audio').remove([ap])
      if(cp)await supabase.storage.from('music-covers').remove([cp])
      setMsg('Đã xóa bài nhạc.')
      await load();await onPublished()
    }catch(err){setMsg(err.message)}finally{setBusy(false)}
  }

  return <div className="studio manager-studio">
    <form className="studio-form" onSubmit={add}>
      <h3>Thêm bài nhạc</h3>
      <label>Tên bài<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <label>Ca sĩ / Artist<input value={form.artist} onChange={e=>setForm({...form,artist:e.target.value})}/></label>
      <label>MP3 / M4A<input type="file" accept="audio/*" onChange={e=>setForm({...form,audio:e.target.files?.[0]||null})}/></label>
      <div className="or-line"><span>hoặc</span></div>
      <label>Link YouTube<input value={form.youtube_url} onChange={e=>setForm({...form,youtube_url:e.target.value})} placeholder="https://youtube.com/watch?v=..."/></label>
      <label>Ảnh bìa<input type="file" accept="image/*" onChange={e=>setForm({...form,cover:e.target.files?.[0]||null})}/></label>
      <button className="primary" disabled={busy}><Plus size={17}/>{busy?'Đang xử lý...':'Thêm nhạc'}</button>
    </form>

    <section className="manage-section">
      <div className="section-head"><div><span>Quản lý</span><h3>Danh sách bài nhạc</h3></div></div>
      <div className="manage-list">{tracks.length?tracks.map(t=><div className="manage-row" key={t.id}>
        <div className="manage-thumb">{t.cover_url?<img src={t.cover_url} alt=""/>:<Disc3 size={22}/>}</div>
        <div className="manage-info"><strong>{t.title}</strong><small>{t.artist||'Không có artist'}</small></div>
        <button className="ghost small-action" onClick={()=>edit(t)}>Sửa</button>
        <button className="danger small-action" onClick={()=>remove(t)}><Trash2 size={15}/> Xóa</button>
      </div>):<div className="empty">Chưa có bài nhạc.</div>}</div>
    </section>
    {msg&&<div className="studio-msg"><CheckCircle2 size={17}/>{msg}</div>}
  </div>
}

function AuthModal({close,session,mode,setMode}){useEscapeClose(close);const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const submit=async e=>{e.preventDefault();if(!supabaseReady){setMessage('Hãy cấu hình Supabase trong file .env trước.');return}setBusy(true);setMessage('');let r;if(mode==='signup')r=await supabase.auth.signUp({email,password,options:{data:{display_name:name||email.split('@')[0]}}});else r=await supabase.auth.signInWithPassword({email,password});setBusy(false);setMessage(r.error?r.error.message:(mode==='signup'?'Đăng ký thành công. Hãy kiểm tra email nếu Supabase bật xác nhận email.':'Đăng nhập thành công.'))}
  if(session)return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-label="Tài khoản"><button className="close" onClick={close} aria-label="Đóng"><X/></button><div className="modal-icon"><UserRound/></div><h3>Tài khoản</h3><p className="muted">{session.user.email}</p><button className="primary wide" onClick={()=>supabase?.auth.signOut()}>Đăng xuất</button></div></div>
  return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-label={mode==='login'?'Đăng nhập':'Tạo tài khoản'}><button className="close" onClick={close} aria-label="Đóng"><X/></button><div className="modal-icon"><Headphones/></div><h3>{mode==='login'?'Chào mừng quay lại':'Tạo tài khoản'}</h3><p className="muted">Mọi tài khoản đều nghe chung thư viện podcast, nhưng tiến độ được lưu riêng.</p><form onSubmit={submit}>{mode==='signup'&&<label>Tên hiển thị<input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên của bạn"/></label>}<label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"/></label><label>Mật khẩu<input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label><button className="primary wide" disabled={busy}>{busy?'Đang xử lý...':mode==='login'?'Đăng nhập':'Đăng ký'}</button></form>{message&&<p className="form-message">{message}</p>}<button className="switch-auth" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Chưa có tài khoản? Đăng ký':'Đã có tài khoản? Đăng nhập'}</button></div></div>}

function CreatorStudio({onPublished,profile}){
  const [tab,setTab]=useState('episode'),[podcasts,setPodcasts]=useState([]),[episodes,setEpisodes]=useState([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState('')
  const [pod,setPod]=useState({title:'',description:'',author:'',category:'',cover:null})
  const [ep,setEp]=useState({podcast_id:'',title:'',description:'',episode_number:'',season_number:'1',audio:null})

  const load=async()=>{
    const [{data:p,error:pe},{data:e,error:ee}]=await Promise.all([
      supabase.from('podcasts').select('*').order('created_at',{ascending:false}),
      supabase.from('episodes').select('*').order('published_at',{ascending:false})
    ])
    if(pe||ee)setMsg(pe?.message||ee?.message||'Không tải được dữ liệu.')
    setPodcasts(p||[]);setEpisodes(e||[])
    if(p?.length&&!ep.podcast_id)setEp(x=>({...x,podcast_id:p[0].id}))
  }
  useEffect(()=>{load()},[])

  const upload=async(bucket,file,prefix)=>{
    const ext=file.name.split('.').pop()
    const path=`${prefix}/${crypto.randomUUID()}.${ext}`
    const {error}=await supabase.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type||undefined,cacheControl:'31536000'})
    if(error)throw error
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const createPodcast=async e=>{
    e.preventDefault();setBusy(true);setMsg('')
    try{
      let cover=''
      if(pod.cover)cover=await upload('podcast-covers',pod.cover,'covers')
      const {error}=await supabase.from('podcasts').insert({owner_id:profile.id,title:pod.title,description:pod.description,author:pod.author||profile.display_name||'Creator',category:pod.category,cover_url:cover,visibility:'public',published:true})
      if(error)throw error
      setPod({title:'',description:'',author:'',category:'',cover:null})
      setMsg('Đã tạo podcast.')
      await load();await onPublished()
    }catch(err){setMsg(err.message)}finally{setBusy(false)}
  }

  const createEpisode=async e=>{
    e.preventDefault()
    if(!ep.audio){setMsg('Hãy chọn file MP3/M4A.');return}
    setBusy(true);setMsg('')
    try{
      const audio=await upload('podcast-audio',ep.audio,'episodes')
      const {error}=await supabase.from('episodes').insert({podcast_id:ep.podcast_id,title:ep.title,description:ep.description,audio_url:audio,episode_number:Number(ep.episode_number)||null,season_number:Number(ep.season_number)||1,published:true,published_at:new Date().toISOString()})
      if(error)throw error
      setEp(x=>({...x,title:'',description:'',episode_number:'',audio:null}))
      setMsg('Đã đăng tập.')
      await load();await onPublished()
    }catch(err){setMsg(err.message)}finally{setBusy(false)}
  }

  const editPodcast=async p=>{
    const title=prompt('Tên podcast:',p.title);if(title===null)return
    const description=prompt('Mô tả:',p.description||'');if(description===null)return
    const {error}=await supabase.from('podcasts').update({title:title.trim()||p.title,description}).eq('id',p.id)
    setMsg(error?error.message:'Đã cập nhật podcast.')
    if(!error){await load();await onPublished()}
  }
  const editEpisode=async e=>{
    const title=prompt('Tên tập:',e.title);if(title===null)return
    const description=prompt('Mô tả:',e.description||'');if(description===null)return
    const {error}=await supabase.from('episodes').update({title:title.trim()||e.title,description}).eq('id',e.id)
    setMsg(error?error.message:'Đã cập nhật tập.')
    if(!error){await load();await onPublished()}
  }

  const removeEpisode=async e=>{
    if(!confirm(`Xóa tập "${e.title}"?`))return
    setBusy(true);setMsg('')
    try{
      const {error}=await supabase.from('episodes').delete().eq('id',e.id)
      if(error)throw error
      const path=storagePath('podcast-audio',e.audio_url)
      if(path)await supabase.storage.from('podcast-audio').remove([path])
      setMsg('Đã xóa tập.')
      await load();await onPublished()
    }catch(err){setMsg(err.message)}finally{setBusy(false)}
  }

  const removePodcast=async p=>{
    const related=episodes.filter(e=>e.podcast_id===p.id)
    if(!confirm(`Xóa podcast "${p.title}" và ${related.length} tập bên trong?`))return
    setBusy(true);setMsg('')
    try{
      const {error}=await supabase.from('podcasts').delete().eq('id',p.id)
      if(error)throw error
      for(const e of related){const path=storagePath('podcast-audio',e.audio_url);if(path)await supabase.storage.from('podcast-audio').remove([path])}
      const cp=storagePath('podcast-covers',p.cover_url);if(cp)await supabase.storage.from('podcast-covers').remove([cp])
      setMsg('Đã xóa podcast.')
      await load();await onPublished()
    }catch(err){setMsg(err.message)}finally{setBusy(false)}
  }

  return <div className="studio manager-studio">
    <div className="studio-tabs">
      <button className={tab==='episode'?'active':''} onClick={()=>setTab('episode')}>Đăng tập</button>
      <button className={tab==='podcast'?'active':''} onClick={()=>setTab('podcast')}>Tạo Podcast</button>
      <button className={tab==='manage'?'active':''} onClick={()=>setTab('manage')}>Quản lý</button>
    </div>

    {tab==='podcast'&&<form className="studio-form" onSubmit={createPodcast}>
      <h3>Tạo Podcast</h3>
      <label>Tên podcast<input required value={pod.title} onChange={e=>setPod({...pod,title:e.target.value})}/></label>
      <label>Tác giả<input value={pod.author} onChange={e=>setPod({...pod,author:e.target.value})}/></label>
      <label>Thể loại<input value={pod.category} onChange={e=>setPod({...pod,category:e.target.value})}/></label>
      <label>Mô tả<textarea rows="4" value={pod.description} onChange={e=>setPod({...pod,description:e.target.value})}/></label>
      <label>Ảnh bìa<input type="file" accept="image/*" onChange={e=>setPod({...pod,cover:e.target.files?.[0]||null})}/></label>
      <button className="primary" disabled={busy}><Plus size={17}/>{busy?'Đang tạo...':'Tạo Podcast'}</button>
    </form>}

    {tab==='episode'&&<form className="studio-form" onSubmit={createEpisode}>
      <h3>Đăng tập Podcast</h3>
      <label>Podcast<select required value={ep.podcast_id} onChange={e=>setEp({...ep,podcast_id:e.target.value})}><option value="">Chọn podcast</option>{podcasts.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      <label>Tên tập<input required value={ep.title} onChange={e=>setEp({...ep,title:e.target.value})}/></label>
      <div className="form-grid"><label>Season<input type="number" min="1" value={ep.season_number} onChange={e=>setEp({...ep,season_number:e.target.value})}/></label><label>Episode<input type="number" min="1" value={ep.episode_number} onChange={e=>setEp({...ep,episode_number:e.target.value})}/></label></div>
      <label>Mô tả<textarea rows="4" value={ep.description} onChange={e=>setEp({...ep,description:e.target.value})}/></label>
      <label>MP3 / M4A<input required type="file" accept="audio/*" onChange={e=>setEp({...ep,audio:e.target.files?.[0]||null})}/></label>
      <button className="primary" disabled={busy}><Upload size={17}/>{busy?'Đang upload...':'Đăng tập'}</button>
    </form>}

    {tab==='manage'&&<section className="manage-section">
      <div className="section-head"><div><span>Podcast Studio</span><h3>Podcast của tôi</h3></div></div>
      {podcasts.length?podcasts.map(p=><div className="manage-podcast" key={p.id}>
        <div className="manage-podcast-head">
          <div className="manage-thumb">{p.cover_url?<img src={p.cover_url} alt=""/>:<Headphones size={22}/>}</div>
          <div className="manage-info"><strong>{p.title}</strong><small>{episodes.filter(e=>e.podcast_id===p.id).length} tập • {p.author||'Creator'}</small></div>
          <button className="ghost small-action" onClick={()=>editPodcast(p)}>Sửa</button>
          <button className="danger small-action" onClick={()=>removePodcast(p)}><Trash2 size={15}/> Xóa</button>
        </div>
        <div className="manage-episodes">{episodes.filter(e=>e.podcast_id===p.id).map(e=><div className="manage-row episode-manage" key={e.id}>
          <div className="manage-info"><strong>{e.title}</strong><small>Season {e.season_number||1} • Episode {e.episode_number||'-'}</small></div>
          <button className="ghost small-action" onClick={()=>editEpisode(e)}>Sửa</button>
          <button className="danger small-action" onClick={()=>removeEpisode(e)}><Trash2 size={15}/> Xóa</button>
        </div>)}</div>
      </div>):<div className="empty">Chưa có Podcast. Hãy tạo Podcast đầu tiên.</div>}
    </section>}

    {msg&&<div className="studio-msg"><CheckCircle2 size={17}/>{msg}</div>}
  </div>
}

function NoteModal({episode,timestamp,close,onSave}){useEscapeClose(close);const[text,setText]=useState('');return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-label="Ghi chú"><button className="close" onClick={close} aria-label="Đóng"><X/></button><div className="modal-icon"><StickyNote/></div><h3>Ghi chú tại {fmt(timestamp)}</h3><p className="muted">{episode.title}</p><textarea autoFocus rows="5" value={text} onChange={e=>setText(e.target.value)} placeholder="Ý tưởng, câu nói hay, điều muốn nhớ..."/><button className="primary wide" onClick={()=>onSave(text,timestamp)}>Lưu ghi chú</button></div></div>}
function Toast({text,onDone}){useEffect(()=>{const t=setTimeout(onDone,2200);return()=>clearTimeout(t)},[]);return <div className="toast">{text}</div>}
