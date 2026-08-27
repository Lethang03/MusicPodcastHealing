# Podcast Vault V7 — QA report

## Đã sửa
- Khai báo đầy đủ `currentTrackId`, `activePlayer`, `selectedPodcastId`, `selectedTrackId`, `listeningEvents` để không còn crash `... is not defined`.
- Chỉ còn **1 `<audio>` engine** cho cả Podcast và Music; không còn `new Audio()` phụ trong source.
- Khi đổi bài/tập, vị trí và số giây nghe của media cũ được ghi trước khi nạp media mới, tránh metadata/stat bị ghi nhầm sang bài mới.
- Bấm lại bài/tập đang chọn sẽ gửi yêu cầu Play thay vì không phản hồi.
- Auto Next/Previous có fallback loop cả khi thư viện chỉ có 1 file audio phát được.
- Không xóa `currentTrackId/currentId` đã lưu trước khi thư viện Supabase load xong.
- Khi Supabase trả thư viện rỗng, UI được làm rỗng thật thay vì giữ dữ liệu cũ.
- Listening Stats không còn giới hạn 5.000 listening events và streak dùng ngày local thay vì UTC.
- `useEffect` theme không return chuỗi `dark/light`.
- Service Worker chỉ đăng ký ở production; localhost tự gỡ SW/cache cũ.
- SQL `listening_progress."current_time"` đã quote đúng cho PostgreSQL.

## Nâng cấp giao diện
- Sidebar/sidebar active state tinh gọn, glass background và spacing mới.
- Hero Podcast mới, card/episode hover nhẹ, hierarchy rõ hơn.
- Music library table được bọc panel premium, row playing nổi bật hơn.
- Podcast Detail / Music Detail có hero panel thống nhất.
- Profile/Stats/Playlist/Studio được làm mềm và đồng bộ radius/surface.
- Now Playing cố định được nâng cấp; cover lớn hơn, backdrop blur tốt hơn.
- Mobile bottom HUD căn lại 5 mục chính, player nằm đúng phía trên HUD.
- Full player mobile có nền tập trung vào cover và điều khiển.

## Kiểm tra kỹ thuật đã chạy
- TypeScript parser/check trên `App.jsx`, `main.jsx`, `supabase.js`: **PASS** (dùng module stubs vì môi trường QA không tải npm registry được).
- CSS brace balance: **640/640 PASS**.
- `<audio>` trong `src`: **1**.
- `new Audio()` trong `src`: **0**.
- Không còn `useEffect(()=>expression)` có nguy cơ return giá trị cleanup sai.
- Kiểm tra Service Worker development guard: **PASS**.
- Kiểm tra `"current_time"` trong SQL: **PASS**.

## Giới hạn kiểm thử môi trường
Môi trường QA không truy cập được npm registry nên không thể chạy `npm install`/`vite build` thực tế. Source đã qua parser/type-level static check không còn lỗi JS/JSX chưa khai báo. Khi chạy trên máy có dependencies, dùng `npm install && npm run build` để xác nhận bundle production.


## V7.1 Reference UI + localhost performance

- Library rebuilt to match the supplied reference: 2-column cards, episode badge, filters, progress, grid/list switch.
- Header now has global search, notification affordance, and profile avatar.
- Now Playing restyled as a floating bottom player.
- Images in library/home use lazy loading + async decoding.
- React.StrictMode removed in development to prevent media effects from mounting twice.
- Audio preload changed from `auto` to `metadata`.
- Timeline UI updates throttled to about 4 fps instead of doing React state work on every timeupdate callback.
- Podcast progress database writes reduced from ~5s to ~8s during playback.
