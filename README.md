# Podcast Vault Community + Music V4

Bản này được nâng từ web nghe podcast cá nhân thành **thư viện podcast dùng chung cho nhiều tài khoản**.

## Cách hoạt động

- Admin/Creator upload podcast một lần.
- Podcast `public` hiện cho tất cả tài khoản.
- Mỗi người có tiến độ nghe riêng.
- Favorites, history, bookmark, note, playlist tách riêng theo `user_id`.
- PC và điện thoại đồng bộ qua Supabase khi đăng nhập.
- Nếu mất mạng, tiến độ vẫn lưu local; giao diện hiển thị trạng thái offline.
- Mobile có mini-player và full-screen player riêng.

## Tính năng chính

- Đăng ký / đăng nhập
- Profile + role: listener / creator / admin
- Thư viện podcast công khai dùng chung
- Creator Studio
- Tạo Podcast
- Upload MP3/M4A lên Supabase Storage
- Upload cover
- Continue Listening
- Tự lưu tiến độ mỗi khoảng 5 giây
- Lưu khi Pause
- Completed > 95%
- Favorites
- History
- Playlist
- Bookmark timestamp
- Note timestamp
- Speed 0.5x–3x
- Sleep timer
- Volume
- Dark / Light
- Responsive mobile
- Mobile fullscreen player
- PWA
- Netlify SPA config

## 1. Cài

```bash
npm install
```

## 2. Tạo Supabase

Tạo project mới rồi vào SQL Editor chạy toàn bộ:

```text
supabase/schema.sql
```

## 3. Tạo tài khoản chủ web

Chạy app, đăng ký tài khoản của bạn trước.

Sau đó trong SQL Editor chạy:

```sql
update public.profiles
set role='admin'
where id=(select id from auth.users where email='EMAIL_CUA_BAN');
```

Đăng xuất rồi đăng nhập lại. Menu **Studio** sẽ xuất hiện.

## 4. ENV

Copy `.env.example` thành `.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

Không đưa `.env` lên GitHub.

## 5. Chạy

```bash
npm run dev
```

## 6. Quy trình sử dụng

Admin:
1. Login
2. Studio
3. Tạo Podcast
4. Upload Episode MP3/M4A
5. Tập được public

Người khác:
1. Mở web
2. Đăng ký
3. Thấy podcast bạn đã đăng
4. Nghe bình thường
5. Tiến độ của họ được lưu riêng

## 7. Deploy Netlify

Build command:
```text
npm run build
```

Publish:
```text
dist
```

Thêm 2 Environment Variables:
```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## 8. Điện thoại

Web đã có responsive mobile + PWA.

Android/Chrome:
- mở site
- chọn Install app / Add to Home Screen

iPhone/Safari:
- Share
- Add to Home Screen

Lưu ý: PWA trên iOS có một số giới hạn nền do Safari. Khi người dùng đóng hẳn app, audio không thể tiếp tục như native app. Khi app đang hoạt động/background hợp lệ, player vẫn dùng audio HTML5.


## V3 bổ sung

- Queue "Nghe tiếp theo"
- Tự phát tập trong Queue
- Nếu Queue trống, tự phát tập tiếp theo cùng podcast
- Sắp xếp Queue lên/xuống
- Xóa từng tập hoặc xóa toàn bộ Queue
- Profile người dùng
- Display name
- Bio
- Role
- Listening Stats
- Tổng giờ nghe
- Số tập hoàn thành
- Podcast nghe nhiều nhất
- Listening Streak theo ngày

### Lưu ý về nội dung YouTube / TikTok

Không nên mặc định rằng tải được video/audio từ YouTube hoặc TikTok đồng nghĩa với việc được phép đăng lại công khai.

Chỉ nên upload nếu:
- bạn sở hữu nội dung; hoặc
- tác giả/chủ sở hữu đã cho phép; hoặc
- nội dung có giấy phép cho phép tái sử dụng và bạn tuân thủ điều kiện của giấy phép.

Nếu chỉ lấy podcast của người khác rồi re-upload lên website công khai, có thể phát sinh khiếu nại bản quyền hoặc yêu cầu gỡ nội dung.

An toàn nhất cho web public là dùng podcast của chính bạn, podcast được cấp phép, hoặc RSS/audio mà publisher cho phép phân phối lại.


## V4 - Music

- Trang Âm nhạc riêng
- Admin/Creator upload MP3/M4A
- Ảnh bìa bài nhạc
- Artist
- Thư viện nhạc dùng chung cho mọi tài khoản
- Có thể lưu link YouTube và phát trực tiếp qua YouTube embed
- Không tự tải YouTube thành MP3

### Vì sao không tự đổi link YouTube thành MP3?

Web public không nên tự động tải/convert YouTube thành MP3 vì:
- việc tải nội dung có thể vi phạm điều khoản của YouTube;
- nhiều nội dung có bản quyền;
- trình duyệt cũng không thể lấy trực tiếp media stream YouTube một cách ổn định qua CORS.

Nếu bạn sở hữu file video MP4, có thể dùng luồng MP4 -> MP3 riêng trong Creator Studio.


## V5 Content Manager

- Podcast và Music tách riêng trong menu.
- Podcast Studio: Tạo Podcast, Đăng tập, Quản lý.
- Music Studio: Thêm nhạc, Sửa, Xóa.
- Xóa Episode sẽ xóa record và file audio trong Storage.
- Xóa Podcast sẽ xóa Podcast + Episodes liên quan và cố dọn audio/cover.
- Xóa Music sẽ xóa record + audio/cover.
- Dữ liệu demo đã được bỏ hoàn toàn.
- `current_time` trong SQL đã được quote để chạy được trên PostgreSQL/Supabase.


## V5.2 Studio Fix
- Fix route Podcast Studio: podcastStudio -> CreatorStudio.
- Fix route Music Studio: musicStudio -> MusicStudio.


## V5.3 Persistent Player
- Music player được mount ở App level, không mất khi đổi trang.
- Chuyển Music -> Podcast mà không bấm phát Podcast: nhạc vẫn chạy.
- Khi bấm phát Podcast: Music tự pause.
- Khi bấm phát Music: Podcast tự pause.
- Trình phát nhạc có tua 10 giây, timeline và volume riêng.


## V5.4 Now Playing
- Thanh Đang phát cố định cho Podcast và Music.
- Hiện rõ loại nội dung: PODCAST hoặc ÂM NHẠC.
- Hiện cover, tên tập/bài, podcast/artist, thời gian, progress, play/pause, tua và volume.
- Đổi trang không mất nội dung đang nghe.
- Khi chuyển giữa Podcast và Music, chỉ player đang active được hiển thị.


## V5.5 Music List UI
- Music library changed from large cards to compact table/list.
- Columns: #, Title, Album, Date added, Duration.
- Hover row number to reveal Play/Pause.
- Current track highlighted.
- Responsive compact mobile list.


## V5.6 - Login Required

- Chưa đăng nhập: chỉ thấy landing page + Đăng nhập / Tạo tài khoản.
- Không render Sidebar, Podcast, Music, Player, History, Playlist hay Stats cho khách.
- Chỉ tải dữ liệu Podcast/Music sau khi có Supabase session.
- Khi logout, dữ liệu thư viện đang giữ trong state được xóa khỏi UI ngay.
- Chạy `supabase/PRIVATE_LOGIN_REQUIRED.sql` trên database hiện có để khóa SELECT cho anonymous users.


## V5.7 Playlist Fix
- Playlist cards are clickable.
- Open playlist detail.
- Add/remove podcast episodes.
- Play all / play individual episode.
- Rename/delete playlist.
- Supabase persistence per user.


## V5.8
- Giữ Login Required.
- Giữ Playlist Fix.
- Đăng xuất sẽ quay thẳng về màn hình Login và xóa nội dung đang phát khỏi UI.
- Supabase vẫn nhớ session giữa các lần mở web cho đến khi người dùng bấm Đăng xuất.

## V6 Mobile Playback Fix

- Media Session API cho Android/PWA: cover + tên bài/tập + Play/Pause + Previous/Next trên media controls khi trình duyệt hỗ trợ.
- MP3/M4A tiếp tục phát khi chuyển sang trang/app khác tốt hơn.
- Music tự chuyển sang bài tiếp theo khi kết thúc.
- Music có Previous / Play-Pause / Next.
- Podcast cũng có Previous / Next Episode qua Media Session và player.
- Thư viện Podcast: card có thể bấm mở trang chi tiết Podcast.
- Trang chi tiết Podcast: cover, mô tả, tác giả, số tập, phát từ đầu và danh sách toàn bộ Episode.
- Profile đổi thành trang riêng: tên, email, role, ngày tham gia, giờ nghe, số tập hoàn thành, streak, podcast nghe nhiều nhất và form chỉnh sửa.

### Android background playback

Background playback tốt nhất với file audio MP3/M4A thật (`audio_url`). Nội dung phát qua YouTube iframe không được đảm bảo phát nền vì chịu giới hạn của YouTube/Chrome/Android.

Android vẫn có thể dừng PWA nếu hệ điều hành kill Chrome/PWA do Battery Saver. Nếu cần background audio tuyệt đối như Spotify, bước tiếp theo là đóng app Android native/Capacitor với foreground media service.


## V6.1 - Loop All

- Podcast: hết tập cuối sẽ tự quay về tập đầu và tiếp tục phát.
- Podcast: Previous ở tập đầu sẽ vòng về tập cuối.
- Music: danh sách nhạc đã có vòng lặp; hết bài cuối quay lại bài đầu.
- Queue được ưu tiên trước; khi Queue trống app quay lại thứ tự Podcast.

## V6.2 Mobile Audio Engine

Fixes:
- Chỉ còn **một `<audio>` engine** cho cả Music và Podcast, tránh phát 2 bài cùng lúc và metadata lệch.
- Media Session Android: Play/Pause/Previous/Next/Seek + cover/tên bài đúng với audio thực tế.
- Auto-next/loop dùng cùng engine; khi đổi trang audio không bị unmount.
- Màn hình chi tiết bài nhạc giống luồng chi tiết Podcast.
- Không còn tạo một `<audio>` ẩn cho từng dòng nhạc để đọc duration; giảm request khi mở thư viện mobile.
- Music duration được lưu vào DB sau lần đầu phát và có migration để thêm cột `duration`.
- Thống kê thời gian nghe dùng `listening_events`: chỉ cộng số giây audio thực sự phát, không cộng vị trí seek hiện tại.
- Khi audio lỗi mạng, player thử nối lại và seek về vị trí trước đó thay vì về 0:00.
- Bottom HUD mobile cố định 5 mục chính để icon/caption thẳng hàng: Podcast / Âm nhạc / Thư viện / Playlist / Hồ sơ.

### Supabase
Run once:

`supabase/V6_2_MOBILE_AUDIO_FIX.sql`

### Android background limitation
Media Session + a persistent HTML audio element improves background playback substantially in Chrome/PWA. Android/OEM battery management may still suspend a web app after it has been backgrounded for a long time. A web/PWA cannot guarantee the same foreground-service behavior as a native Android media app. For guaranteed long-running background playback, package the app with Capacitor and a native media/foreground service.

## V7 Polished + QA
Bản này nâng giao diện desktop/mobile và sửa các lỗi state/audio/stat được ghi trong `QA_REPORT.md`.


## V7.1.2 Repeat
- Repeat Off: hết bài/tập thì dừng.
- Repeat All: hết bài/tập thì chuyển tiếp; cuối danh sách quay về đầu.
- Repeat One: phát lại đúng bài/tập hiện tại.
- Trạng thái Repeat được lưu trên thiết bị.
