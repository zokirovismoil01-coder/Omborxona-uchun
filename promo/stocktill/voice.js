// StockTill reklamasiga o'zbekcha diktor ovozini qo'shadi.
// Musiqa va effektlar audio.js'dan qayta sintez qilinadi, diktor gaplari voice/lines.json
// bo'yicha sahnalarga joylanadi, gap paytida musiqa pasaytiriladi va tayyor videoning
// tasviri bilan birlashtiriladi (kadrlar qayta chizilmaydi).
//
//   node stocktill/voice.js                         → stocktill-promo-vertical-ovozli.mp4
//   node stocktill/voice.js --video boshqa.mp4 --out natija.mp4 --wav mix.wav
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { render } = require('./audio.js');
const { svf, writeWav } = require('../audio.js');

const SR = 48000;
const DUCK_DB = -9;        // diktor gapirayotganda musiqa shuncha pasayadi
const PRESENCE_DB = -4;    // nutq chastotalari (~2 kHz atrofi) musiqada qo'shimcha bo'shatiladi
const VOICE_OVER_BED = 9;  // diktor pasaytirilgan musiqadan shuncha LU baland eshitiladi
const TARGET_LUFS = -14;   // ijtimoiy tarmoqlar uchun odatiy balandlik
const CEIL = 0.82;         // limiter shifti (≈ −1.7 dBFS; AAC kodlashdan keyin ham −1 dBTP dan past)

const dB = (x) => Math.pow(10, x / 20);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

function args() {
  const a = { video: path.join(__dirname, 'stocktill-promo-vertical.mp4'), out: path.join(__dirname, 'stocktill-promo-vertical-ovozli.mp4') };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i += 2) a[v[i].replace(/^--/, '')] = path.resolve(v[i + 1]);
  return a;
}

function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(r.stderr.toString());
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}

// ITU-R BS.1770 bo'yicha balandlik (LUFS). spans berilsa, faqat shu oraliqlar ichidagi bloklar o'lchanadi.
function lufs(chans, spans) {
  const K = [[1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
    [1, -2, 1, -1.99004745483398, 0.99007225036621]];
  const N = chans[0].length, blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR);
  const cum = chans.map((x) => {
    let y = Float64Array.from(x);
    for (const [b0, b1, b2, a1, a2] of K) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < N; i++) {
        const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = y[i]; y2 = y1; y1 = v; y[i] = v;
      }
    }
    const c = new Float64Array(N + 1);
    for (let i = 0; i < N; i++) c[i + 1] = c[i] + y[i] * y[i];
    return c;
  });
  const z = [];
  for (let s = 0; s + blk <= N; s += hop) {
    if (spans && !spans.some(([a, b]) => s / SR >= a && (s + blk) / SR <= b)) continue;
    z.push(cum.reduce((acc, c) => acc + (c[s + blk] - c[s]) / blk, 0));
  }
  const L = (m) => -0.691 + 10 * Math.log10(m);
  const mean = (a) => a.reduce((p, q) => p + q, 0) / a.length;
  const abs = z.filter((m) => L(m) > -70);
  const rel = L(mean(abs)) - 10;
  return L(mean(abs.filter((m) => L(m) > rel)));
}

// Oldinga qaraydigan (5 ms) limiter: cho'qqilar shiftdan oshmaydi, tiklanish silliq
function limit(chans, ceil) {
  const N = chans[0].length, W = Math.round(0.005 * SR);
  const req = new Float32Array(N), mn = new Float32Array(N), dq = new Int32Array(N);
  for (let i = 0; i < N; i++) req[i] = Math.min(1, ceil / (Math.max(Math.abs(chans[0][i]), Math.abs(chans[1][i])) + 1e-9));
  let h = 0, tl = 0;
  for (let i = N - 1; i >= 0; i--) {
    while (tl > h && req[dq[tl - 1]] >= req[i]) tl--;
    dq[tl++] = i;
    while (dq[h] > i + W) h++;
    mn[i] = req[dq[h]];
  }
  const rel = Math.exp(-1 / (0.08 * SR));
  let acc = 0, g = 1, most = 1, at = 0, busy = 0;
  for (let i = 0; i < N; i++) {
    acc += mn[i]; if (i >= W) acc -= mn[i - W];
    const sm = acc / Math.min(i + 1, W);
    g = sm < g ? sm : g + (sm - g) * (1 - rel);
    if (g < most) { most = g; at = i / SR; }
    if (g < 0.891) busy++;
    for (const c of chans) c[i] = clamp(c[i] * g, -ceil, ceil);
  }
  return { db: 20 * Math.log10(most), at, busy: busy / SR };
}

function main() {
  const a = args();
  const html = fs.readFileSync(path.join(__dirname, 'video.html'), 'utf8');
  const cues = new Function('return ' + html.match(/const CUES = (\[[\s\S]*?\]);/)[1])();
  const duration = +html.match(/DURATION = ([\d.]+)/)[1];
  const N = Math.ceil(duration * SR);

  // 1) Diktor: har bir gap umumiy yozuvdan kesib olinadi va o'z soniyasiga qo'yiladi
  const lines = JSON.parse(fs.readFileSync(path.join(__dirname, 'voice', 'lines.json'), 'utf8'));
  const take = decode(path.join(__dirname, 'voice', 'narration.mp3'));
  const voice = new Float32Array(N);
  const spans = [];
  // gaplar balandligi bir-biriga yaqinlashtiriladi (farqning 70 %i, ko'pi bilan ±3 dB)
  const rms = lines.map((ln) => {
    let s = 0; const a0 = Math.round(ln.from * SR), a1 = Math.round(ln.to * SR);
    for (let k = a0; k < a1; k++) s += take[k] * take[k];
    return 10 * Math.log10(s / (a1 - a0));
  });
  const median = [...rms].sort((p, q) => p - q)[rms.length >> 1];
  lines.forEach((ln, i) => {
    const prevEnd = i ? lines[i - 1].to : 0, nextStart = i + 1 < lines.length ? lines[i + 1].from : take.length / SR;
    const pre = Math.min(0.03, (ln.from - prevEnd) / 2), post = Math.min(0.08, (nextStart - ln.to) / 2);
    const s0 = Math.round((ln.from - pre) * SR), s1 = Math.round((ln.to + post) * SR);
    const d0 = Math.round((ln.at - pre) * SR), fi = 0.01 * SR, fo = 0.04 * SR;
    const lg = dB(clamp(0.7 * (median - rms[i]), -3, 3));
    for (let k = 0; k < s1 - s0 && d0 + k < N; k++) {
      const env = Math.min(1, k / fi, (s1 - s0 - k) / fo);
      voice[d0 + k] += take[s0 + k] * env * lg;
    }
    spans.push([ln.at, ln.at + ln.to - ln.from]);
    if (i && spans[i][0] < spans[i - 1][1] + 0.1) console.warn(`Diqqat: ${i}- va ${i + 1}-gaplar ustma-ust tushdi`);
  });
  // past chastotalarni kesish va yengil kompressor (2.5:1): baland bo'g'inlar musiqa ustida "sakramaydi"
  const hpf = svf();
  const thr = median + 4, atk = Math.exp(-1 / (0.005 * SR)), rel = Math.exp(-1 / (0.12 * SR));
  let env = 0;
  for (let i = 0; i < N; i++) {
    const x = hpf(voice[i], 80, 0.707, SR).hp;
    const p = x * x;
    env = p > env ? atk * env + (1 - atk) * p : rel * env + (1 - rel) * p;
    const over = 10 * Math.log10(env + 1e-12) - thr;
    voice[i] = x * (over > 0 ? dB(-over * (1 - 1 / 2.5)) : 1);
  }

  // 2) Musiqa: gap paytida pasayadi (0.15 s oldin boshlab, 0.5 s keyin tiklanadi),
  //    yaqin gaplar orasida qayta ko'tarilmaydi
  const merged = [];
  for (const s of spans) {
    if (merged.length && s[0] - merged[merged.length - 1][1] < 0.8) merged[merged.length - 1][1] = s[1];
    else merged.push([...s]);
  }
  const duck = new Float32Array(N);
  for (const [t0, t1] of merged) {
    for (let i = Math.max(0, Math.floor((t0 - 0.15) * SR)); i < Math.min(N, Math.ceil((t1 + 0.5) * SR)); i++) {
      const t = i / SR;
      duck[i] = Math.max(duck[i], Math.min(smooth((t - (t0 - 0.15)) / 0.15), 1 - smooth((t - t1) / 0.5)));
    }
  }
  const bed = render(cues, duration, SR);
  const gD = dB(DUCK_DB), gP = dB(PRESENCE_DB);
  for (const ch of bed) {
    const f = svf();
    for (let i = 0; i < N; i++) {
      const gp = 1 + (gP - 1) * duck[i], gd = 1 + (gD - 1) * duck[i];
      const band = f(ch[i], 2200, 0.8, SR).bp * 1.25;   // k·bp: polosa qismi, x = lp + k·bp + hp
      ch[i] = (ch[i] - (1 - gp) * band) * gd;
    }
  }

  // 3) Balandliklar: diktor musiqadan VOICE_OVER_BED LU baland, umumiy natija TARGET_LUFS
  const lv = lufs([voice, voice], spans), lb = lufs(bed, spans);
  const gv = dB(VOICE_OVER_BED - (lv - lb));
  const mix = bed.map((ch) => ch.map((x, i) => x + voice[i] * gv));
  const g = dB(TARGET_LUFS - lufs(mix));
  for (const ch of mix) for (let i = 0; i < N; i++) ch[i] *= g;
  const lim = limit(mix, CEIL);
  console.log(`diktor ${lv.toFixed(1)} LUFS, musiqa (gap paytida) ${lb.toFixed(1)} LUFS, diktorga ${(20 * Math.log10(gv)).toFixed(1)} dB; ` +
    `natija ${lufs(mix).toFixed(1)} LUFS; limiter: eng ko'pi ${lim.db.toFixed(1)} dB (${lim.at.toFixed(2)} s), 1 dB dan ortiq ${lim.busy.toFixed(2)} s`);

  // 4) Videoga qo'shish: tasvir o'zgarmaydi (-c:v copy), faqat ovoz almashadi
  const wav = a.wav || path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'voice-')), 'mix.wav');
  writeWav(wav, mix, SR);
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', a.video, '-i', wav, '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', a.out], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
  if (!a.wav) fs.rmSync(path.dirname(wav), { recursive: true, force: true });
  console.log(`Tayyor: ${a.out}`);
}

main();
