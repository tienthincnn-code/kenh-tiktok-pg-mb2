// Robot quet TikTok cho kenh PG — doc trang CONG KHAI cua tung tai khoan bang yt-dlp (mien phi), KHONG xem noi dung video, KHONG ton token AI.
// Chay: node scripts/quet-tiktok.mjs            (can yt-dlp trong PATH: pip install -U yt-dlp)
//       node scripts/quet-tiktok.mjs --gia      (tao so GIA de thu trang, khong goi TikTok)
// Ket qua: data/ket-qua.json (trang index.html doc file nay).
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const chay = promisify(execFile);
const CH = JSON.parse(fs.readFileSync('cau-hinh.json', 'utf8'));
const OUT = 'data/ket-qua.json';
const GIA = process.argv.includes('--gia');
const TAG = boDau(CH.hashtag).replace(/[^a-z0-9]/g, '');
if (!TAG) { console.error('Chua dien "hashtag" trong cau-hinh.json'); process.exit(1); }

function boDau(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase(); }
const ngayVN = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);

// ---- 1. Danh sach tai khoan: TAI_KHOAN_CSV_URL (Google Sheet xuat ban CSV, de trong GitHub Secret) hoac file tai-khoan.csv ----
function docCsv(txt) {
  const dong = txt.replace(/\r/g, '').split('\n').filter(x => x.trim());
  const tach = l => { const o = []; let cur = '', q = false; for (const c of l) { if (c === '"') q = !q; else if (c === ',' && !q) { o.push(cur); cur = ''; } else cur += c; } o.push(cur); return o.map(x => x.trim()); };
  const dau = tach(dong.shift() || '').map(x => boDau(x));
  const iTk = dau.findIndex(x => /tiktok|link|tai ?khoan|kenh/.test(x)), iNhom = dau.findIndex(x => /nhom|team|sale/.test(x));
  if (iTk < 0) throw new Error('File danh sach thieu cot "tiktok"');
  const ds = new Map();
  for (const l of dong) {
    const c = tach(l), raw = c[iTk] || '';
    const h = ((raw.match(/tiktok\.com\/@([^\/?#\s]+)/i) || raw.match(/^@?([\w.]+)$/) || [])[1] || '').toLowerCase();
    if (h) ds.set(h, (iNhom >= 0 ? c[iNhom] : '') || 'Chưa có nhóm');
  }
  return ds;
}
async function layDanhSach() {
  const url = process.env.TAI_KHOAN_CSV_URL;
  if (url) { const r = await fetch(url); if (!r.ok) throw new Error('Khong tai duoc TAI_KHOAN_CSV_URL: ' + r.status); return docCsv(await r.text()); }
  if (fs.existsSync('tai-khoan.csv')) return docCsv(fs.readFileSync('tai-khoan.csv', 'utf8'));
  if (GIA) return docCsv(fs.readFileSync('tai-khoan.mau.csv', 'utf8'));
  throw new Error('Chua co danh sach: tao file tai-khoan.csv (cot tiktok,nhom) hoac Secret TAI_KHOAN_CSV_URL');
}

// ---- 2. Doc 1 tai khoan bang yt-dlp ----
let CU = { taiKhoan: {}, video: [], secUid: {} };
try { CU = { ...CU, ...JSON.parse(fs.readFileSync(OUT, 'utf8')) }; } catch (e) {}
const SEC = { ...(CU.secUid || {}) };
const loiNgan = e => String(e.stderr || e.message || e).trim().split('\n').pop().slice(0, 160);
async function layDs(url) {
  const { stdout } = await chay('yt-dlp', ['--no-warnings', '-J', '--flat-playlist', '--playlist-end', String(CH.soVideoMoiKenh || 30), url], { maxBuffer: 64e6, timeout: 120000 });
  return JSON.parse(stdout).entries || [];
}
async function docKenh(h) {
  // yt-dlp doi khi bao "Unable to extract secondary user ID" khi doc @ten -> doc lai bang tiktokuser:<secUid> lay tu 1 video cu
  if (SEC[h]) { try { return { ds: await layDs('tiktokuser:' + SEC[h]) }; } catch (e) { delete SEC[h]; } }
  let msg;
  try { return { ds: await layDs('https://www.tiktok.com/@' + h) }; }
  catch (e) { msg = loiNgan(e); if (/does not have any videos/i.test(msg)) return { ds: [] }; }
  const cu = (CU.video || []).filter(v => v.h === h).sort((a, b) => (b.d > a.d ? 1 : -1)).slice(0, 3);
  for (const v of cu) {
    try {
      const { stdout } = await chay('yt-dlp', ['--no-warnings', '-J', 'https://www.tiktok.com/@' + h + '/video/' + v.id], { maxBuffer: 64e6, timeout: 120000 });
      const cid = JSON.parse(stdout).channel_id; if (!cid) continue;
      const ds = await layDs('tiktokuser:' + cid); SEC[h] = cid; return { ds };
    } catch (e) { msg = loiNgan(e); }
  }
  return { loi: msg || 'khong doc duoc' };
}
function soGia(h) {   // --gia: so ngau nhien co dinh theo ten tai khoan
  let s = [...h].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7); const r = () => ((s = s * 1103515245 + 12345 >>> 0) % 1000) / 1000;
  return Array.from({ length: 6 + Math.floor(r() * 10) }, (_, i) => { const n = Math.floor(r() ** 3 * 4000) + 20;
    return { id: String(7e18 + Math.floor(r() * 1e15)), timestamp: Math.floor(Date.now() / 1000) - i * 86400 * (1 + Math.floor(r() * 2)), view_count: n, like_count: Math.floor(n * r() * .08), comment_count: Math.floor(r() * 6), repost_count: Math.floor(r() * 4), title: r() > .2 ? 'video #' + CH.hashtag : 'video khong tag' }; });
}

// ---- 3. Chay ----
const ds = await layDanhSach();
const tatCa = [...ds.keys()];
const tkCu = CU.taiKhoan || {};
// moi luot toi da toiDaMoiLuot tai khoan, uu tien tai khoan lau chua quet nhat -> nhieu tai khoan thi tu xoay vong
const hangDoi = tatCa.sort((a, b) => ((tkCu[a] || {}).quet || '') < ((tkCu[b] || {}).quet || '') ? -1 : 1).slice(0, CH.toiDaMoiLuot || 300);
console.log('Khu vuc', CH.khuVuc, '| #' + CH.hashtag, '|', tatCa.length, 'tai khoan, luot nay quet', hangDoi.length);
const video = new Map((CU.video || []).map(v => [v.id, v]));
const taiKhoan = {};
tatCa.forEach(h => taiKhoan[h] = { nhom: ds.get(h), quet: (tkCu[h] || {}).quet || '', ok: (tkCu[h] || {}).ok || 0, loi: (tkCu[h] || {}).loi || '' });
let ok = 0, i = 0;
await Promise.all(Array.from({ length: CH.soLuongSongSong || 3 }, async () => {
  while (i < hangDoi.length) {
    const h = hangDoi[i++];
    const r = GIA ? { ds: soGia(h) } : await docKenh(h);
    taiKhoan[h].quet = new Date().toISOString();
    if (r.loi) { taiKhoan[h].ok = 0; taiKhoan[h].loi = r.loi; console.log('  loi', h, r.loi); continue; }
    ok++; taiKhoan[h].ok = 1; taiKhoan[h].loi = '';
    for (const e of r.ds) {
      if (!e.id || !e.timestamp) continue;
      const text = boDau([e.title, e.description].filter(Boolean).join(' ')).replace(/[^a-z0-9#]/g, '');
      video.set(String(e.id), { id: String(e.id), h, d: ngayVN(e.timestamp * 1000), n: +e.view_count || 0, l: +e.like_count || 0, c: +e.comment_count || 0, s: +e.repost_count || 0, t: text.includes(TAG) ? 1 : 0 });
    }
    if (!GIA) await new Promise(z => setTimeout(z, 800));   // gian nhip de TikTok it chan
  }
}));
if (!GIA && hangDoi.length && ok === 0) { console.error('Khong doc duoc tai khoan nao (co the TikTok dang chan) -> giu nguyen so cu'); process.exit(1); }
if (ok < hangDoi.length * 0.5) console.log('::warning::Chi doc duoc ' + ok + '/' + hangDoi.length + ' tai khoan');
const moc = ngayVN(Date.now() - (CH.giuSoNgay || 62) * 86400e3);
const conLai = [...video.values()].filter(v => v.d >= moc && taiKhoan[v.h]).sort((a, b) => (a.d < b.d ? 1 : -1));
const kq = { mau: 'kenh-pg@1', khuVuc: CH.khuVuc, hashtag: CH.hashtag, capNhat: new Date().toISOString(), docDuoc: ok, luotNay: hangDoi.length, taiKhoan, video: conLai, secUid: SEC };
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(kq));
console.log('Xong: doc duoc', ok + '/' + hangDoi.length, 'tai khoan ·', conLai.length, 'video trong', CH.giuSoNgay || 62, 'ngay');
