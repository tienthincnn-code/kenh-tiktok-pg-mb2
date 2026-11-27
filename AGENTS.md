# Bộ mẫu "Kênh TikTok PG" — hướng dẫn cho trợ lý AI (Claude, ChatGPT/Codex, Gemini…)

Bộ này để **một khu vực OPPO tự dựng báo cáo kênh TikTok của PG**, chạy miễn phí mỗi sáng.
Mô hình gốc: Region Marketing Tiền Giang (11/2026). Người dùng thường là RM hoặc Sale, không phải lập trình viên:
trả lời bằng tiếng Việt, ngắn, từng bước, tự làm thay họ những gì làm được.

## Bộ này gồm gì
| File | Việc |
|---|---|
| `cau-hinh.json` | Tên khu vực, hashtag khu vực, ngưỡng view cao/thấp, giới hạn quét |
| `tai-khoan.csv` | Danh sách kênh TikTok của PG: cột `tiktok` (link hoặc @tên) và `nhom` (vd Team 1). Tạo từ `tai-khoan.mau.csv` |
| `scripts/quet-tiktok.mjs` | Robot: đọc trang công khai của từng kênh bằng **yt-dlp**, ghi `data/ket-qua.json` |
| `.github/workflows/quet-tiktok.yml` | Lịch chạy robot 6h sáng (giờ VN) mỗi ngày trên GitHub Actions |
| `index.html` | Trang kết quả: tổng khu vực, theo nhóm, video trên/dưới ngưỡng, đánh giá từng kênh |

Robot **chỉ đọc số công khai** (view, tim, bình luận, chia sẻ, mô tả) — **không xem nội dung video, không gọi AI, 0 token, 0 đồng**.
Video chỉ được tính khi mô tả có hashtag khu vực trong `cau-hinh.json`.

## Khi người dùng mở phiên lần đầu: dựng theo 6 bước
Hỏi **một lần** những gì còn thiếu: tên khu vực · hashtag khu vực · danh sách kênh PG (file, sheet hoặc dán vào) · họ có tài khoản GitHub chưa.
1. Điền `cau-hinh.json` (`khuVuc`, `hashtag` không có dấu #).
2. Tạo `tai-khoan.csv` từ danh sách họ đưa: chỉ 2 cột `tiktok,nhom`. **Không** đưa tên PG, số điện thoại, doanh số vào repo (repo công khai = ai cũng đọc được). `nhom` nên là mã nhóm (Team 1, Team Sale A…), không cần tên thật.
   - Danh sách nằm ở Google Sheet và muốn giữ kín: Sheet → Tệp → Chia sẻ → Xuất bản lên web → CSV, đặt link vào GitHub Secret `TAI_KHOAN_CSV_URL` thay cho file.
3. Thử trang bằng số giả: `node scripts/quet-tiktok.mjs --gia` rồi mở `index.html` qua 1 máy chủ tĩnh (vd `npx serve .`). Xong thì xoá `data/ket-qua.json` giả.
4. Tạo repo GitHub **công khai** của khu vực, đẩy toàn bộ bộ này lên (nhánh `main`).
5. Repo → Settings → Actions → General → Workflow permissions → **Read and write permissions** (để robot ghi được số). Rồi Settings → Pages → Deploy from branch `main` / root. Link trang = `https://<tài-khoản>.github.io/<repo>/`.
6. Repo → Actions → "Quet TikTok PG" → Run workflow để chạy lần đầu. Xem log: dòng `Xong: doc duoc x/y tai khoan`.
7. **Đăng ký vào báo cáo toàn quốc:** điền 1 dòng vào Google Sheet https://docs.google.com/spreadsheets/d/1XltfNjay4AgWAo7-6_o7hZfaWD0L4_vBYZIVbNQWI74/edit (Khu vực · Người phụ trách · Link trang kết quả ở bước 5 · Hashtag). Trang tổng toàn quốc https://mrdt1988.github.io/dashboard-phu-kien/toan-quoc-pg.html tự đọc số của khu vực từ link này — không đổi tên file `data/ket-qua.json`, không đổi cấu trúc file.

## Nếu bạn là AI chỉ chat, không chạy được lệnh (ChatGPT, Gemini, Claude trên web)
Bạn không tự tạo repo hay chạy robot được, nên **hướng dẫn người dùng bấm tay trên web GitHub**, mỗi lần 1 bước, chờ họ báo xong mới sang bước sau:
1. Bạn sửa giúp nội dung `cau-hinh.json` và `tai-khoan.csv` (đưa lại toàn văn để họ dán).
2. github.com → New repository → đặt tên, chọn **Public** → Create.
3. Trong repo: Add file → Upload files → kéo **toàn bộ** thư mục đã giải nén (cả thư mục `.github`, `scripts`, `data`) → Commit. Nếu thư mục `.github` không tải lên được (bị ẩn trên máy): Add file → Create new file → gõ tên `.github/workflows/quet-tiktok.yml` → dán nội dung file đó.
4. Settings → Actions → General → Workflow permissions → chọn **Read and write permissions** → Save.
5. Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)` → Save.
6. Actions → "Quet TikTok PG" → Run workflow. Chờ 5–15 phút, mở link Pages xem kết quả.
7. Đăng ký vào Sheet toàn quốc (bước 7 ở trên).
Bỏ qua bước thử bằng số giả (`--gia`) vì cần máy chạy lệnh.

## Vận hành và sửa lỗi
- Đạt khi robot đọc được **trên 95% kênh mỗi ngày** (dòng phụ trên đầu trang kết quả).
- Kênh báo lỗi: kiểm link kênh đúng chưa, kênh có để riêng tư không. Robot bỏ qua kênh lỗi, giữ số cũ.
- **TikTok chặn nhiều** (đọc được dưới 50%): giảm `toiDaMoiLuot` (robot tự xoay vòng kênh lâu chưa quét nhất), giảm `soLuongSongSong` xuống 2, hoặc chạy trên 1 máy tính của khu vực: cài GitHub self-hosted runner rồi đặt biến repo `MAY_CHAY` = `self-hosted`.
- yt-dlp hỏng sau khi TikTok đổi giao diện: workflow luôn cài bản yt-dlp mới nhất; đợi 1–3 ngày hoặc xem https://github.com/yt-dlp/yt-dlp/issues.
- Đổi ngưỡng 🔥/🧊: sửa `nguongCao`, `nguongThap` trong `cau-hinh.json`, không sửa code.

## Luật khi sửa
- Không đưa token, mật khẩu, tên/số điện thoại PG, doanh số vào repo.
- Sửa `index.html` xong: mở thử ở khổ 390px và 1280px, không lỗi console rồi mới đẩy.
- Không bật trả phí (Apify, máy chạy lớn của GitHub…). Toàn bộ mô hình phải giữ 0 đồng.
- Muốn AI xem nội dung video: chỉ làm theo yêu cầu, chấm có chọn lọc (top/đáy mỗi tuần), không chạy tự động hằng ngày.
